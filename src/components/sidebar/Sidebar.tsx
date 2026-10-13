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
import { Layers } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { rooms } = useHubStore();
  const { currentRoom, setVoiceConnecting, setRoomJoined } = useRoomStore();
  const { isMicMuted, setMicStream, selectedAudioInputId } = useLocalMediaStore();
  const { addToast } = useUIStore();

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
    <aside className="w-72 sm:w-80 h-full flex flex-col justify-between border-r border-[#E7E6DF] bg-[#F7F6F0] shrink-0 p-4 overflow-hidden z-20">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Cabeçalho da Barra Lateral com Brand CALL */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#E7E6DF]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-black tracking-tight text-[#171717] px-2 py-0.5 rounded-lg bg-[#EFEEE8] border border-[#E7E6DF]">
              CALL
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#686861]">
              Salas
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#FFFFFF] text-[10px] font-mono font-bold text-[#171717] border border-[#E7E6DF] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            {rooms.length} Salas
          </span>
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
