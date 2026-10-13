import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff, Settings } from 'lucide-react';
import { useRoomStore } from '../../stores/roomStore';
import { useLocalMediaStore } from '../../stores/localMediaStore';
import { useUIStore } from '../../stores/uiStore';
import { DeviceManager } from '../../media/devices';
import { signalingClient } from '../../signaling/client';
import { webRtcMesh } from '../../rtc/Mesh';

export const VoiceControlSidebar: React.FC = () => {
  const { currentRoom } = useRoomStore();
  const {
    cameraStream,
    screenStream,
    isMicMuted,
    setMicMuted
  } = useLocalMediaStore();
  const { setIsSettingsOpen, addToast } = useUIStore();

  if (!currentRoom) return null;

  const isCameraActive = !!cameraStream;
  const isScreenActive = !!screenStream;
  const isBudgetFull = currentRoom.activeVideos >= 12;
  const isDisplaySupported = DeviceManager.isDisplayMediaSupported();

  const handleToggleMic = () => {
    const next = !isMicMuted;
    setMicMuted(next);
    signalingClient.send({ type: 'mic', muted: next });
  };

  const handleToggleCamera = async () => {
    if (isCameraActive) {
      await webRtcMesh.stopCamera();
    } else {
      if (isBudgetFull) {
        addToast('Limite de vídeos da sala atingido (máx 12).', 'info');
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
        addToast('Limite de vídeos da sala atingido (máx 12).', 'info');
        return;
      }
      await webRtcMesh.requestScreen();
    }
  };

  const handleLeave = () => {
    signalingClient.send({ type: 'leave-room' });
    webRtcMesh.leave();
  };

  return (
    <div className="p-3 bg-[#FFFFFF] rounded-[20px] border border-[#E7E6DF] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-2 shrink-0">
      <div className="flex items-center justify-between pb-2 border-b border-[#E7E6DF]">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold text-[#171717] truncate">
            {currentRoom.name}
          </span>
        </div>
        <button
          onClick={handleLeave}
          title="Desconectar da sala"
          className="p-1.5 rounded-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors tactile-btn cursor-pointer"
        >
          <PhoneOff size={14} />
        </button>
      </div>

      {/* Controles de Mídia embutidos na lateral */}
      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
        {/* Microfone */}
        <button
          onClick={handleToggleMic}
          title={isMicMuted ? 'Ativar microfone' : 'Mutar microfone'}
          className={`p-2 rounded-[12px] flex items-center justify-center transition-all tactile-btn cursor-pointer border ${
            isMicMuted
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-[#EFEEE8] border-[#E7E6DF] text-[#171717] hover:bg-[#E7E6DF]'
          }`}
        >
          {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        {/* Câmera */}
        <button
          onClick={handleToggleCamera}
          disabled={!isCameraActive && isBudgetFull}
          title={isCameraActive ? 'Desligar câmera' : 'Ligar câmera'}
          className={`p-2 rounded-[12px] flex items-center justify-center transition-all tactile-btn cursor-pointer border ${
            isCameraActive
              ? 'bg-[#B7FF2A] border-[#A6EC1F] text-[#171717] font-bold shadow-[0_2px_8px_rgba(183,255,42,0.35)]'
              : 'bg-[#EFEEE8] border-[#E7E6DF] text-[#171717] hover:bg-[#E7E6DF]'
          }`}
        >
          {isCameraActive ? <Video size={16} /> : <VideoOff size={16} />}
        </button>

        {/* Compartilhar Tela */}
        {isDisplaySupported ? (
          <button
            onClick={handleToggleScreen}
            disabled={!isScreenActive && isBudgetFull}
            title={isScreenActive ? 'Parar tela' : 'Compartilhar tela'}
            className={`p-2 rounded-[12px] flex items-center justify-center transition-all tactile-btn cursor-pointer border ${
              isScreenActive
                ? 'bg-[#B7FF2A] border-[#A6EC1F] text-[#171717] font-bold shadow-[0_2px_8px_rgba(183,255,42,0.35)]'
                : 'bg-[#EFEEE8] border-[#E7E6DF] text-[#171717] hover:bg-[#E7E6DF]'
            }`}
          >
            {isScreenActive ? <Monitor size={16} /> : <MonitorOff size={16} />}
          </button>
        ) : (
          <div />
        )}

        {/* Configurações */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          title="Ajustes de dispositivos"
          className="p-2 rounded-[12px] bg-[#EFEEE8] border border-[#E7E6DF] text-[#171717] hover:bg-[#E7E6DF] flex items-center justify-center transition-all tactile-btn cursor-pointer"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
};
