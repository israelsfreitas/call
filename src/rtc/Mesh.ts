import { PeerConnection } from './PeerConnection';
import { QualityController } from './QualityController';
import { StatsMonitor } from './StatsMonitor';
import { fetchIceServers } from '../config/ice';
import { signalingClient } from '../signaling/client';
import { useRoomStore } from '../stores/roomStore';
import { useLocalMediaStore } from '../stores/localMediaStore';
import { useHubStore } from '../stores/hubStore';
import { useUIStore } from '../stores/uiStore';
import { Participant, QualityTier } from '../signaling/protocol';

export class WebRTCMesh {
  private peers: Map<string, PeerConnection> = new Map();
  private iceServers: RTCIceServer[] = [];
  private qualityController: QualityController;
  private statsMonitor: StatsMonitor;
  private audioContext: AudioContext | null = null;
  private localAudioAnalyser: AnalyserNode | null = null;
  private peerAnalysers: Map<string, AnalyserNode> = new Map();
  private speechDetectionTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.qualityController = new QualityController(() => {
      this.reapplyQualityToAll();
    });

    this.statsMonitor = new StatsMonitor(
      () => Array.from(this.peers.values()).map(p => p.getRawConnection()).filter(Boolean) as RTCPeerConnection[],
      (action) => {
        if (action === 'close-camera') {
          useUIStore.getState().addToast('Desempenho baixo: câmera desligada automaticamente para manter áudio estável.', 'info');
          // Fecha câmera
          this.stopCamera();
        } else {
          this.qualityController.setLocalOverride(action);
          useUIStore.getState().addToast('Qualidade de vídeo ajustada automaticamente devido à rede ou CPU.', 'info');
        }
      },
      () => {
        this.qualityController.setLocalOverride(null);
      }
    );
  }

  public async init() {
    this.iceServers = await fetchIceServers();
    this.setupSignalingListeners();
    this.startSpeechDetection();
  }

  private setupSignalingListeners() {
    signalingClient.onMessage(async (msg) => {
      switch (msg.type) {
        case 'room-joined': {
          this.statsMonitor.start();
          this.syncPeersWithRoom(msg.room.participants);
          this.qualityController.setRoomTier(msg.room.tier);
          break;
        }

        case 'room-state': {
          this.syncPeersWithRoom(msg.room.participants);
          this.qualityController.setRoomTier(msg.room.tier);
          break;
        }

        case 'signal': {
          if (!msg.from) return;
          const peer = this.peers.get(msg.from);
          if (peer) {
            if (msg.description) {
              await peer.handleRemoteDescription(msg.description);
            }
            if (msg.candidate) {
              await peer.handleRemoteCandidate(msg.candidate);
            }
          }
          break;
        }

        case 'subscribe': {
          if (!msg.from) return;
          const peer = this.peers.get(msg.from);
          if (peer) {
            await peer.setPeerSubscription(msg.camera, msg.screen);
          }
          break;
        }

        case 'open-granted': {
          if (msg.kind === 'camera') {
            await this.publishLocalCamera();
          } else if (msg.kind === 'screen') {
            await this.publishLocalScreen();
          }
          break;
        }

        case 'open-denied': {
          let reasonMsg = 'Não foi possível abrir o vídeo no momento.';
          if (msg.reason === 'video-budget-full') {
            reasonMsg = 'Limite de vídeos da sala atingido (máx 12). Aguarde alguém fechar a câmera ou tela.';
          } else if (msg.reason === 'screen-limit') {
            reasonMsg = 'Limite de telas compartilhadas atingido (máx 3).';
          } else if (msg.reason === 'camera-limit') {
            reasonMsg = 'Limite de câmeras atingido (máx 10).';
          }
          useUIStore.getState().addToast(reasonMsg, 'error');
          break;
        }
      }
    });
  }

  public async syncPeersWithRoom(participants: Participant[]) {
    const selfId = useHubStore.getState().selfId;
    if (!selfId) return;

    const currentPeerIds = new Set(participants.filter(p => p.id !== selfId).map(p => p.id));

    // Fecha conexões de quem saiu
    for (const [peerId, peer] of this.peers.entries()) {
      if (!currentPeerIds.has(peerId)) {
        peer.close();
        this.peers.delete(peerId);
        useRoomStore.getState().removePeerMedia(peerId);
        this.peerAnalysers.delete(peerId);
      }
    }

    // Cria conexão para novos participantes
    for (const p of participants) {
      if (p.id === selfId) continue;

      if (!this.peers.has(p.id)) {
        // Regra do Iniciador: quem tem o peerId lexicograficamente MENOR é o iniciador
        const isInitiator = selfId.localeCompare(p.id) < 0;
        this.createPeerConnection(p.id, isInitiator);
      }
    }

    this.updateQualityControllersCount();
  }

  private createPeerConnection(peerId: string, isInitiator: boolean) {
    const peer = new PeerConnection(
      peerId,
      isInitiator,
      this.iceServers,
      this.qualityController,
      {
        onSignal: (description, candidate) => {
          signalingClient.send({
            type: 'signal',
            to: peerId,
            description,
            candidate
          });
        },
        onRemoteTrack: (kind, stream) => {
          useRoomStore.getState().setPeerStream(peerId, kind, stream);
          if (kind === 'audio' && stream) {
            this.setupRemoteAudioAnalysis(peerId, stream);
          }
        },
        onConnectionFailed: () => {
          console.warn(`Conexão com ${peerId} falhou após tentativas. Recriando...`);
          peer.close();
          this.peers.delete(peerId);
          const selfId = useHubStore.getState().selfId || '';
          this.createPeerConnection(peerId, selfId.localeCompare(peerId) < 0);
        }
      }
    );

    this.peers.set(peerId, peer);

    // Se nós já tivermos mídia ativa, passa as tracks para o novo peer
    const { micStream, cameraStream, screenStream } = useLocalMediaStore.getState();
    if (micStream) {
      const audioTrack = micStream.getAudioTracks()[0] || null;
      peer.replaceTrack('mic', audioTrack);
    }
    if (cameraStream) {
      const videoTrack = cameraStream.getVideoTracks()[0] || null;
      peer.replaceTrack('camera', videoTrack);
    }
    if (screenStream) {
      const screenVideoTrack = screenStream.getVideoTracks()[0] || null;
      const screenAudioTrack = screenStream.getAudioTracks()[0] || null;
      peer.replaceTrack('screen', screenVideoTrack);
      peer.replaceTrack('screenAudio', screenAudioTrack);
    }

    if (isInitiator) {
      peer.startOffer();
    }
  }

  // ---- LOCAL MEDIA ACTIONS ----

  public async setLocalMicTrack(track: MediaStreamTrack | null) {
    for (const peer of this.peers.values()) {
      await peer.replaceTrack('mic', track);
    }
    if (track) {
      this.setupLocalAudioAnalysis(track);
    }
  }

  public async requestCamera() {
    signalingClient.send({ type: 'request-open', kind: 'camera' });
  }

  public async publishLocalCamera() {
    try {
      const { selectedVideoInputId } = useLocalMediaStore.getState();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedVideoInputId ? { exact: selectedVideoInputId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      const videoTrack = stream.getVideoTracks()[0];
      useLocalMediaStore.getState().setCameraStream(stream);

      for (const peer of this.peers.values()) {
        await peer.replaceTrack('camera', videoTrack);
      }

      this.qualityController.updateActiveStreams(true, !!useLocalMediaStore.getState().screenStream);
    } catch (e: any) {
      useUIStore.getState().addToast(
        e.name === 'NotReadableError'
          ? 'Câmera em uso por outro aplicativo ou sistema.'
          : 'Não foi possível acessar a câmera.',
        'error'
      );
      signalingClient.send({ type: 'close', kind: 'camera' });
    }
  }

  public async stopCamera() {
    const { cameraStream } = useLocalMediaStore.getState();
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      useLocalMediaStore.getState().setCameraStream(null);
    }

    for (const peer of this.peers.values()) {
      await peer.replaceTrack('camera', null);
    }

    signalingClient.send({ type: 'close', kind: 'camera' });
    this.qualityController.updateActiveStreams(false, !!useLocalMediaStore.getState().screenStream);
  }

  public async requestScreen() {
    signalingClient.send({ type: 'request-open', kind: 'screen', screenAudio: true });
  }

  public async publishLocalScreen() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15 }
        },
        audio: true
      });

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0] || null;

      // Evento nativo de parada pelo botão do navegador
      videoTrack.onended = () => {
        this.stopScreen();
      };

      useLocalMediaStore.getState().setScreenStream(stream);

      for (const peer of this.peers.values()) {
        await peer.replaceTrack('screen', videoTrack);
        if (audioTrack) {
          await peer.replaceTrack('screenAudio', audioTrack);
        }
      }

      this.qualityController.updateActiveStreams(!!useLocalMediaStore.getState().cameraStream, true);
    } catch (e) {
      signalingClient.send({ type: 'close', kind: 'screen' });
    }
  }

  public async stopScreen() {
    const { screenStream } = useLocalMediaStore.getState();
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      useLocalMediaStore.getState().setScreenStream(null);
    }

    for (const peer of this.peers.values()) {
      await peer.replaceTrack('screen', null);
      await peer.replaceTrack('screenAudio', null);
    }

    signalingClient.send({ type: 'close', kind: 'screen' });
    this.qualityController.updateActiveStreams(!!useLocalMediaStore.getState().cameraStream, false);
  }

  public sendSubscription(toPeerId: string, camera: boolean, screen: boolean) {
    signalingClient.send({
      type: 'subscribe',
      to: toPeerId,
      camera,
      screen
    });
  }

  public reapplyQualityToAll() {
    for (const peer of this.peers.values()) {
      peer.updateQualityParameters();
    }
  }

  private updateQualityControllersCount() {
    const cameraReceivers = Array.from(this.peers.values()).filter(p => p.isCameraSubscribedByPeer).length;
    const screenReceivers = Array.from(this.peers.values()).filter(p => p.isScreenSubscribedByPeer).length;
    this.qualityController.updateReceiversCount(cameraReceivers, screenReceivers);
  }

  // ---- AUDIO SPEECH ANALYSIS ----

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  private setupLocalAudioAnalysis(track: MediaStreamTrack) {
    try {
      const ctx = this.getAudioContext();
      const source = ctx.createMediaStreamSource(new MediaStream([track]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      this.localAudioAnalyser = analyser;
    } catch (e) {
      console.warn('Erro ao configurar análise de áudio local:', e);
    }
  }

  private setupRemoteAudioAnalysis(peerId: string, stream: MediaStream) {
    try {
      const ctx = this.getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      this.peerAnalysers.set(peerId, analyser);
    } catch (e) {
      console.warn(`Erro ao configurar análise de áudio de ${peerId}:`, e);
    }
  }

  private startSpeechDetection() {
    const dataArray = new Uint8Array(128);

    this.speechDetectionTimer = setInterval(() => {
      // Local
      if (this.localAudioAnalyser && !useLocalMediaStore.getState().isMicMuted) {
        this.localAudioAnalyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, v) => acc + v, 0);
        const avg = sum / dataArray.length;
        const speaking = avg > 15;
        useLocalMediaStore.getState().setIsSpeaking(speaking);
      } else {
        useLocalMediaStore.getState().setIsSpeaking(false);
      }

      // Remotos
      for (const [peerId, analyser] of this.peerAnalysers.entries()) {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, v) => acc + v, 0);
        const avg = sum / dataArray.length;
        const speaking = avg > 15;
        useRoomStore.getState().setPeerSpeaking(peerId, speaking);
      }
    }, 150);
  }

  public leave() {
    this.statsMonitor.stop();
    for (const peer of this.peers.values()) {
      peer.close();
    }
    this.peers.clear();
    this.peerAnalysers.clear();
    this.localAudioAnalyser = null;
    useLocalMediaStore.getState().stopAllMedia();
    useRoomStore.getState().leaveRoomState();
  }
}

export const webRtcMesh = new WebRTCMesh();
