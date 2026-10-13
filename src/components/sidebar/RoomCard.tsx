import React from 'react';
import { Volume2, Lock, Mic, MicOff, Video, VideoOff, Monitor, Radio } from 'lucide-react';
import { RoomSummary, RoomParticipantSummary } from '../../signaling/protocol';
import { useRoomStore } from '../../stores/roomStore';
import { useHubStore } from '../../stores/hubStore';
import { Avatar } from '../common/Avatar';

interface RoomCardProps {
  room: RoomSummary;
  onSelect: (roomId: string) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onSelect }) => {
  const currentRoom = useRoomStore(s => s.currentRoom);
  const selfId = useHubStore(s => s.selfId);
  const isActive = currentRoom?.id === room.id;

  // Participantes da sala (vindos do room-state se for a sala ativa, ou do rooms-state global)
  const participants: RoomParticipantSummary[] = isActive && currentRoom
    ? currentRoom.participants
    : (room.participants || []);

  return (
    <div
      onClick={() => onSelect(room.id)}
      className={`rounded-[20px] border transition-all cursor-pointer overflow-hidden ${
        isActive
          ? 'bg-[#FFFFFF] border-[#171717] shadow-[0_4px_16px_rgba(0,0,0,0.04)] ring-2 ring-[#B7FF2A]/40'
          : 'bg-[#FFFFFF]/70 hover:bg-[#FFFFFF] border-[#E7E6DF] hover:border-[#DCDCD4]'
      }`}
    >
      <div className="flex items-center justify-between p-3.5">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className={`w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 border ${
            isActive
              ? 'bg-[#171717] text-white border-[#171717]'
              : 'bg-[#EFEEE8] text-[#171717] border-[#E7E6DF]'
          }`}>
            {room.private ? <Lock size={14} /> : <Volume2 size={14} />}
          </div>
          <span className="text-xs font-bold text-[#171717] truncate">
            {room.name}
          </span>
        </div>

        {/* Contador de ocupação */}
        <span className="px-2 py-0.5 rounded-full bg-[#EFEEE8] text-[10px] font-mono font-semibold text-[#686861] border border-[#E7E6DF]">
          {room.count}/{room.capacity}
        </span>
      </div>

      {/* Lista de participantes sempre aberta mostrando status de mic, câmera e tela */}
      {participants.length > 0 && (
        <div className="px-3 pb-3 pt-1 flex flex-col gap-1.5 border-t border-[#E7E6DF]/60 bg-[#FBFBFA]/70">
          {participants.map((p) => {
            const isSelf = p.id === selfId;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between py-1 px-2 rounded-[12px] bg-[#FFFFFF] border border-[#E7E6DF]/80 text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Avatar name={p.name} color={p.color} size="sm" />
                  <span className="text-xs font-semibold text-[#171717] truncate max-w-[110px]">
                    {p.name} {isSelf && <span className="text-[#92928A] font-normal">(você)</span>}
                  </span>
                </div>

                {/* Status: Mic, Câmera, Tela */}
                <div className="flex items-center gap-1.5 shrink-0 text-[#686861]">
                  {/* Tela */}
                  {p.screen && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-[#171717] text-[#B7FF2A] tracking-wider animate-pulse" title="Compartilhando tela">
                      <Radio size={9} />
                      AO VIVO
                    </span>
                  )}

                  {/* Câmera */}
                  {p.camera ? (
                    <span title="Câmera aberta">
                      <Video size={13} className="text-emerald-600" />
                    </span>
                  ) : (
                    <span title="Câmera desligada">
                      <VideoOff size={13} className="text-[#DCDCD4]" />
                    </span>
                  )}

                  {/* Microfone */}
                  {p.micMuted ? (
                    <span title="Microfone fechado">
                      <MicOff size={13} className="text-rose-600" />
                    </span>
                  ) : (
                    <span title="Microfone aberto">
                      <Mic size={13} className="text-emerald-600" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
