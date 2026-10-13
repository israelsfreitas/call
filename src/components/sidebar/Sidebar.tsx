import React from 'react';
import { useHubStore } from '../../stores/hubStore';
import { useRoomStore } from '../../stores/roomStore';
import { useLocalMediaStore } from '../../stores/localMediaStore';
import { useUIStore } from '../../stores/uiStore';
import { RoomCard } from './RoomCard';
import { VoiceControlSidebar } from './VoiceControlSidebar';
import { signalingClient } from '../../signaling/client';
import { DeviceManager } from '../../media/devices';
import { webRtcMesh } from '../../rtc/Mesh';
import { Layers, Sun, Moon } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { rooms } = useHubStore();
  const { currentRoom, setVoiceConnecting, setRoomJoined } = useRoomStore();
  const { isMicMuted, setMicStream, selectedAudioInputId } = useLocalMediaStore();
  const { addToast, theme, toggleTheme } = useUIStore();

  const handleSelectRoom = async (roomId: string) => {
    if (currentRoom?.id === roomId) return;

    if (currentRoom) {
      webRtcMesh.leave();
    }

    // Feedback visual instantâneo na interface
    const targetRoomDef = rooms.find(r => r.id === roomId);
    if (targetRoomDef) {
      const selfId = useHubStore.getState().selfId;
      const selfName = useHubStore.getState().selfName;
      const selfColor = useHubStore.getState().selfColor;
      setRoomJoined(
        {
          id: roomId,
          name: targetRoomDef.name,
          participants: [
            {
              id: selfId,
              name: selfName,
              color: selfColor,
              micMuted: isMicMuted,
              camera: false,
              screen: false,
              screenAudio: false
            }
          ],
          activeVideos: 0,
          tier: 'high'
        },
        []
      );
    }

    setVoiceConnecting(true);

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await DeviceManager.getMicrophone(selectedAudioInputId);
        setMicStream(stream);
        await webRtcMesh.setLocalMicTrack(stream.getAudioTracks()[0]);
      }
    } catch (e: any) {
      console.warn('Microfone não concedido, entrando em modo só ouvir:', e);
      addToast('Microfone não detectado ou negado. Você entrou no modo "só ouvir".', 'info');
    }

    signalingClient.setRoomContext(roomId, isMicMuted);
    signalingClient.send({
      type: 'join-room',
      roomId,
      micMuted: isMicMuted
    });
  };

  return (
    <aside className="w-72 sm:w-80 h-full flex flex-col justify-between border-r border-[#E7E6DF] dark:border-[#2A2A28] bg-[#F7F6F0] dark:bg-[#0F0F0E] shrink-0 p-4 overflow-hidden z-20 transition-colors duration-200">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Cabeçalho da Barra Lateral com Brand CALL */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#E7E6DF] dark:border-[#2A2A28]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-black tracking-tight text-[#171717] dark:text-[#171717] px-2 py-0.5 rounded-lg bg-[#EFEEE8] dark:bg-[#B7FF2A] border border-[#E7E6DF] dark:border-[#B7FF2A]">
              CALL
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#686861] dark:text-[#A3A39C]">
              Salas
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              className="p-1.5 rounded-full bg-[#EFEEE8] dark:bg-[#242422] hover:bg-[#E7E6DF] dark:hover:bg-[#2E2E2C] text-[#171717] dark:text-[#F5F5F0] border border-[#E7E6DF] dark:border-[#2A2A28] transition-all cursor-pointer tactile-btn"
            >
              {theme === 'dark' ? <Sun size={13} className="text-[#B7FF2A]" /> : <Moon size={13} />}
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFFFFF] dark:bg-[#181817] text-[10px] font-mono font-bold text-[#171717] dark:text-[#F5F5F0] border border-[#E7E6DF] dark:border-[#2A2A28] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              {rooms.length} Salas
            </span>
          </div>
        </div>

        {/* Lista de Salas com Scroll */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
          {rooms.map(room => (
            <RoomCard key={room.id} room={room} onSelect={handleSelectRoom} />
          ))}
        </div>
      </div>

      {/* Controles de Voz e Mídia fixos no rodapé da barra lateral esquerda */}
      <div className="pt-3">
        <VoiceControlSidebar />
      </div>
    </aside>
  );
};
