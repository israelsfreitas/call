import React from 'react';
import { Video, VideoOff, Monitor, MonitorOff, Mic, MicOff, Volume2, VolumeX, SlidersHorizontal, PhoneOff } from 'lucide-react';
import { useLocalMediaStore } from '../../stores/localMediaStore';
import { useRoomStore } from '../../stores/roomStore';
import { useUIStore } from '../../stores/uiStore';
import { DeviceManager } from '../../media/devices';
import { signalingClient } from '../../signaling/client';
import { webRtcMesh } from '../../rtc/Mesh';

export const ControlBar: React.FC = () => {
  const {
    cameraStream,
    screenStream,
    isMicMuted,
    setMicMuted,
    isIncomingAudioMuted,
    setIncomingAudioMuted
  } = useLocalMediaStore();

  const { currentRoom } = useRoomStore();
  const { setIsSettingsOpen, addToast } = useUIStore();

  if (!currentRoom) return null;

  const isCameraActive = !!cameraStream;
  const isScreenActive = !!screenStream;
  const isBudgetFull = currentRoom.activeVideos >= 12;
  const isDisplaySupported = DeviceManager.isDisplayMediaSupported();

  const handleToggleCamera = async () => {
    if (isCameraActive) {
      await webRtcMesh.stopCamera();
    } else {
      if (isBudgetFull) {
        addToast('Orçamento de vídeos da sala atingido (máx 12). Aguarde alguém fechar um vídeo.', 'info');
        return;
      }
      await webRtcMesh.requestCamera();
    }
  };

  const handleToggleScreen = async () => {
    if (isScreenActive) {
      await webRtcMesh.stopScreen();
    } else {
      if (isBudgetFull) {
        addToast('Orçamento de vídeos da sala atingido (máx 12). Aguarde alguém fechar um vídeo.', 'info');
        return;
      }
      await webRtcMesh.requestScreen();
    }
  };

  const handleToggleMic = () => {
    const next = !isMicMuted;
    setMicMuted(next);
    signalingClient.send({ type: 'mic', muted: next });
  };

  const handleToggleIncomingAudio = () => {
    const next = !isIncomingAudioMuted;
    setIncomingAudioMuted(next);
    const audios = document.querySelectorAll('audio');
    audios.forEach(a => {
      a.muted = next;
    });
  };

  const handleLeave = () => {
    signalingClient.send({ type: 'leave-room' });
    webRtcMesh.leave();
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-panel-strong border border-[var(--border)] shadow-2xl backdrop-blur-xl">
        {/* Câmera */}
        <button
          onClick={handleToggleCamera}
          disabled={!isCameraActive && isBudgetFull}
          title={isBudgetFull && !isCameraActive ? 'Orçamento de vídeos cheio' : 'Alternar câmera'}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isCameraActive
              ? 'bg-[var(--accent-on)] text-white shadow-md'
              : 'hover:bg-white/10 text-[var(--text)]'
          }`}
        >
          {isCameraActive ? <Video size={20} /> : <VideoOff size={20} />}
          <span className="text-[10px] font-semibold mt-1">Câmera</span>
        </button>

        {/* Compartilhamento de Tela */}
        {isDisplaySupported && (
          <button
            onClick={handleToggleScreen}
            disabled={!isScreenActive && isBudgetFull}
            title={isBudgetFull && !isScreenActive ? 'Orçamento de vídeos cheio' : 'Compartilhar tela'}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isScreenActive
                ? 'bg-[var(--accent-on)] text-white shadow-md'
                : 'hover:bg-white/10 text-[var(--text)]'
            }`}
          >
            {isScreenActive ? <Monitor size={20} /> : <MonitorOff size={20} />}
            <span className="text-[10px] font-semibold mt-1">Tela</span>
          </button>
        )}

        {/* Microfone */}
        <button
          onClick={handleToggleMic}
          title={isMicMuted ? 'Desmutar microfone' : 'Mutar microfone'}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
            isMicMuted
              ? 'text-[var(--danger)] bg-[var(--danger)]/15 hover:bg-[var(--danger)]/25'
              : 'hover:bg-white/10 text-[var(--text)]'
          }`}
        >
          {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
          <span className="text-[10px] font-semibold mt-1">Microfone</span>
        </button>

        {/* Som (Deafen) */}
        <button
          onClick={handleToggleIncomingAudio}
          title={isIncomingAudioMuted ? 'Ativar som recebido' : 'Silenciar som recebido'}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
            isIncomingAudioMuted
              ? 'text-[var(--danger)] bg-[var(--danger)]/15 hover:bg-[var(--danger)]/25'
              : 'hover:bg-white/10 text-[var(--text)]'
          }`}
        >
          {isIncomingAudioMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          <span className="text-[10px] font-semibold mt-1">Som</span>
        </button>

        <div className="w-[1px] h-8 bg-[var(--border)] mx-1" />

        {/* Ajustes */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          title="Ajustes de áudio e vídeo"
          className="flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl hover:bg-white/10 text-[var(--text)] transition-all cursor-pointer"
        >
          <SlidersHorizontal size={20} />
          <span className="text-[10px] font-semibold mt-1">Ajustes</span>
        </button>

        {/* Sair */}
        <button
          onClick={handleLeave}
          title="Desconectar da sala"
          className="flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white shadow-lg transition-all cursor-pointer"
        >
          <PhoneOff size={20} />
          <span className="text-[10px] font-semibold mt-1">Sair</span>
        </button>
      </div>
    </div>
  );
};
