import React from 'react';
import { Volume2 } from 'lucide-react';
import { useRoomStore } from '../../stores/roomStore';

export const RoomHeader: React.FC = () => {
  const { currentRoom } = useRoomStore();

  if (!currentRoom) return null;

  const count = currentRoom.participants.length;

  return (
    <div className="h-14 px-5 border-b border-[#E7E6DF] dark:border-[#2A2A28] bg-[#FFFFFF] dark:bg-[#181817] flex items-center justify-between shrink-0 select-none z-10 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-colors duration-200">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-[10px] bg-[#EFEEE8] dark:bg-[#242422] border border-[#E7E6DF] dark:border-[#2A2A28] flex items-center justify-center text-[#171717] dark:text-[#F5F5F0]">
          <Volume2 size={16} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F0] leading-tight">
            {currentRoom.name}
          </h1>
          <span className="text-[11px] text-[#686861] dark:text-[#A3A39C] leading-tight">
            {count} {count === 1 ? 'pessoa conectada' : 'pessoas conectadas'} · clique em um quadro para focar ou alternar modo lado a lado
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-[#EFEEE8] dark:bg-[#242422] text-[#171717] dark:text-[#F5F5F0] border border-[#E7E6DF] dark:border-[#2A2A28] text-[10px] font-bold uppercase tracking-wider font-mono">
          {currentRoom.activeVideos} Vídeos ativos
        </span>
      </div>
    </div>
  );
};
