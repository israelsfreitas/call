import React from 'react';
import { Volume2, VolumeX, Mic, MicOff, SlidersHorizontal, PhoneOff } from 'lucide-react';
import { useRoomStore } from '../../stores/roomStore';
import { useLocalMediaStore } from '../../stores/localMediaStore';
import { useUIStore } from '../../stores/uiStore';
import { APP_CONFIG } from '../../config/app';
import { signalingClient } from '../../signaling/client';
import { webRtcMesh } from '../../rtc/Mesh';

export const VoiceStatusCard: React.FC = () => {
  const { currentRoom, isVoiceConnecting } = useRoomStore();
  const { isMicMuted, setMicMuted, isIncomingAudioMuted, setIncomingAudioMuted } = useLocalMediaStore();
  const { setIsSettingsOpen } = useUIStore();

  if (!currentRoom) return null;

  const handleToggleMic = () => {
    const next = !isMicMuted;
    setMicMuted(next);
    signalingClient.send({ type: 'mic', muted: next });
  };

  const handleToggleIncomingAudio = () => {
    const next = !isIncomingAudioMuted;
    setIncomingAudioMuted(next);
    // Controla mute de todos os elementos <audio>
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
    <div className="p-3 rounded-2xl glass-panel-strong border border-[var(--border)] flex flex-col gap-2.5 shrink-0 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isVoiceConnecting ? 'bg-amber-400 animate-pulse' : 'bg-[var(--accent-on)]'}`} />
            <span className="text-xs font-bold text-[var(--accent)] truncate">
              {isVoiceConnecting ? 'Conectando...' : 'Voz conectada'}
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
            {currentRoom.name} / {APP_CONFIG.serverName}
          </span>
        </div>

        {/* Desconectar */}
        <button
          onClick={handleLeave}
          title="Desconectar da sala"
          className="p-2 rounded-xl bg-[var(--danger)]/20 text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-colors cursor-pointer"
        >
          <PhoneOff size={16} />
        </button>
      </div>

      {/* Botões rápidos de ação */}
      <div className="flex items-center justify-around pt-1 border-t border-[var(--border)]">
        <button
          onClick={handleToggleMic}
          title={isMicMuted ? 'Desmutar microfone' : 'Mutar microfone'}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            isMicMuted
              ? 'text-[var(--danger)] bg-[var(--danger)]/15 hover:bg-[var(--danger)]/25'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'
          }`}
        >
          {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <button
          onClick={handleToggleIncomingAudio}
          title={isIncomingAudioMuted ? 'Ativar som recebido' : 'Silenciar som recebido'}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            isIncomingAudioMuted
              ? 'text-[var(--danger)] bg-[var(--danger)]/15 hover:bg-[var(--danger)]/25'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'
          }`}
        >
          {isIncomingAudioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          title="Ajustes de áudio e vídeo"
          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors cursor-pointer"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>
    </div>
  );
};
