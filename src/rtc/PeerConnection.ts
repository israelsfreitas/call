import { QualityController } from './QualityController';

export interface PeerConnectionCallbacks {
  onSignal: (description?: RTCSessionDescriptionInit, candidate?: RTCIceCandidateInit) => void;
  onRemoteTrack: (kind: 'audio' | 'camera' | 'screen' | 'screenAudio', stream: MediaStream | null) => void;
  onConnectionFailed: () => void;
}

export class PeerConnection {
  public readonly peerId: string;
  public readonly isInitiator: boolean;
  private pc: RTCPeerConnection | null = null;
  private iceServers: RTCIceServer[];
  private callbacks: PeerConnectionCallbacks;
  private qualityController: QualityController;

  // 4 transceivers fixos
  private micTransceiver: RTCRtpTransceiver | null = null;
  private cameraTransceiver: RTCRtpTransceiver | null = null;
  private screenTransceiver: RTCRtpTransceiver | null = null;
  private screenAudioTransceiver: RTCRtpTransceiver | null = null;

  // Streams remotos recebidos
  private remoteAudioStream: MediaStream = new MediaStream();
  private remoteCameraStream: MediaStream = new MediaStream();
  private remoteScreenStream: MediaStream = new MediaStream();
  private remoteScreenAudioStream: MediaStream = new MediaStream();

  private isClosed = false;
  private restartAttempts = 0;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Subscrição remota deste par para nossos streams
  public isCameraSubscribedByPeer = true;
  public isScreenSubscribedByPeer = true;

  constructor(
    peerId: string,
    isInitiator: boolean,
    iceServers: RTCIceServer[],
    qualityController: QualityController,
    callbacks: PeerConnectionCallbacks
  ) {
    this.peerId = peerId;
    this.isInitiator = isInitiator;
    this.iceServers = iceServers;
    this.qualityController = qualityController;
    this.callbacks = callbacks;

    this.initPeerConnection();
  }

  public getRawConnection(): RTCPeerConnection | null {
    return this.pc;
  }

  private initPeerConnection() {
    this.pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      bundlePolicy: 'max-bundle'
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.onSignal(undefined, event.candidate.toJSON());
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const state = this.pc.connectionState;

      if (state === 'disconnected') {
        if (!this.disconnectTimer) {
          this.disconnectTimer = setTimeout(() => {
            if (this.pc && this.pc.connectionState === 'disconnected') {
              this.handleConnectionIssue();
            }
          }, 5000);
        }
      } else if (state === 'connected') {
        if (this.disconnectTimer) {
          clearTimeout(this.disconnectTimer);
          this.disconnectTimer = null;
        }
        this.restartAttempts = 0;
      } else if (state === 'failed') {
        this.handleConnectionIssue();
      }
    };

    if (this.isInitiator) {
      // Regra dos 4 transceivers na ordem fixa criados pelo iniciador antes do offer
      this.micTransceiver = this.pc.addTransceiver('audio', { direction: 'sendrecv' });
      this.cameraTransceiver = this.pc.addTransceiver('video', { direction: 'sendrecv' });
      this.screenTransceiver = this.pc.addTransceiver('video', { direction: 'sendrecv' });
      this.screenAudioTransceiver = this.pc.addTransceiver('audio', { direction: 'sendrecv' });
      this.setupTrackListeners();
    } else {
      this.pc.ontrack = (event) => {
        this.handleIncomingTrack(event);
      };
    }
  }

  private setupTrackListeners() {
    if (!this.pc) return;
    this.pc.ontrack = (event) => {
      this.handleIncomingTrack(event);
    };
  }

  private handleIncomingTrack(event: RTCTrackEvent) {
    const transceivers = this.pc?.getTransceivers() || [];
    const index = transceivers.indexOf(event.transceiver);

    if (index === 0) {
      // 0: microfone
      this.remoteAudioStream = new MediaStream([event.track]);
      this.callbacks.onRemoteTrack('audio', this.remoteAudioStream);
    } else if (index === 1) {
      // 1: câmera
      this.remoteCameraStream = new MediaStream([event.track]);
      this.callbacks.onRemoteTrack('camera', this.remoteCameraStream);
      event.track.onended = () => {
        this.callbacks.onRemoteTrack('camera', null);
      };
    } else if (index === 2) {
      // 2: tela
      this.remoteScreenStream = new MediaStream([event.track]);
      this.callbacks.onRemoteTrack('screen', this.remoteScreenStream);
      event.track.onended = () => {
        this.callbacks.onRemoteTrack('screen', null);
      };
    } else if (index === 3) {
      // 3: áudio da tela
      this.remoteScreenAudioStream = new MediaStream([event.track]);
      this.callbacks.onRemoteTrack('screenAudio', this.remoteScreenAudioStream);
      event.track.onended = () => {
        this.callbacks.onRemoteTrack('screenAudio', null);
      };
    }
  }

  public async startOffer(iceRestart = false) {
    if (!this.pc || !this.isInitiator || this.isClosed) return;

    try {
      const offer = await this.pc.createOffer({ iceRestart });
      await this.pc.setLocalDescription(offer);
      this.callbacks.onSignal(this.pc.localDescription || offer, undefined);
    } catch (e) {
      console.error(`Erro ao criar oferta para ${this.peerId}:`, e);
    }
  }

  public async handleRemoteDescription(description: RTCSessionDescriptionInit) {
    if (!this.pc || this.isClosed) return;

    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(description));

      if (!this.isInitiator && description.type === 'offer') {
        // Garantir transceivers na ordem e alterar direção para sendrecv
        const transceivers = this.pc.getTransceivers();
        if (transceivers.length >= 4) {
          this.micTransceiver = transceivers[0];
          this.cameraTransceiver = transceivers[1];
          this.screenTransceiver = transceivers[2];
          this.screenAudioTransceiver = transceivers[3];

          transceivers.forEach(t => {
            if (t.direction !== 'sendrecv') {
              t.direction = 'sendrecv';
            }
          });
        }

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.callbacks.onSignal(this.pc.localDescription || answer, undefined);
      }
    } catch (e) {
      console.error(`Erro ao processar remote description de ${this.peerId}:`, e);
    }
  }

  public async handleRemoteCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc || this.isClosed) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn(`Erro ao adicionar ICE candidate de ${this.peerId}:`, e);
    }
  }

  public async replaceTrack(
    kind: 'mic' | 'camera' | 'screen' | 'screenAudio',
    track: MediaStreamTrack | null
  ) {
    if (this.isClosed) return;

    let transceiver: RTCRtpTransceiver | null = null;
    if (kind === 'mic') transceiver = this.micTransceiver;
    else if (kind === 'camera') transceiver = this.cameraTransceiver;
    else if (kind === 'screen') transceiver = this.screenTransceiver;
    else if (kind === 'screenAudio') transceiver = this.screenAudioTransceiver;

    if (transceiver && transceiver.sender) {
      try {
        await transceiver.sender.replaceTrack(track);

        // Se colocou faixa de vídeo, aplica configurações do QualityController
        if (track && (kind === 'camera' || kind === 'screen')) {
          const isVisible = kind === 'camera' ? this.isCameraSubscribedByPeer : this.isScreenSubscribedByPeer;
          await this.qualityController.applyToSender(transceiver.sender, kind, isVisible);
        }
      } catch (e) {
        console.warn(`Erro em replaceTrack (${kind}) para ${this.peerId}:`, e);
      }
    }
  }

  public async updateQualityParameters() {
    if (this.cameraTransceiver?.sender?.track) {
      await this.qualityController.applyToSender(
        this.cameraTransceiver.sender,
        'camera',
        this.isCameraSubscribedByPeer
      );
    }
    if (this.screenTransceiver?.sender?.track) {
      await this.qualityController.applyToSender(
        this.screenTransceiver.sender,
        'screen',
        this.isScreenSubscribedByPeer
      );
    }
  }

  public async setPeerSubscription(camera: boolean, screen: boolean) {
    this.isCameraSubscribedByPeer = camera;
    this.isScreenSubscribedByPeer = screen;
    await this.updateQualityParameters();
  }

  private handleConnectionIssue() {
    if (this.isClosed) return;

    if (this.isInitiator && this.restartAttempts < 3) {
      this.restartAttempts++;
      this.startOffer(true);
    } else {
      this.callbacks.onConnectionFailed();
    }
  }

  public close() {
    this.isClosed = true;
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }
  }
}
