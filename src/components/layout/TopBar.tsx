import React from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { useHubStore } from '../../stores/hubStore';
import { Cpu } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { name } = useHubStore();
  const { currentRoom } = useRoomStore();

  return (
    <header className="w-full h-16 sm:h-18 border-b border-[#E7E6DF] bg-[#F7F6F0]/95 backdrop-blur-md shrink-0 z-30 transition-colors duration-200">
      <div className="w-full h-full px-4 sm:px-6 grid grid-cols-3 items-center">
        {/* Esquerda: Identificação da Sala Atual */}
        <div className="flex items-center justify-start gap-2">
          {currentRoom ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E7E6DF] text-xs font-semibold text-[#171717] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">{currentRoom.name}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFEEE8] border border-[#E7E6DF] text-xs text-[#686861] font-medium">
              <span>Nenhuma sala</span>
            </div>
          )}
        </div>

        {/* Centro: Logo CALL rigorosamente centralizado */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 select-none" title="CALL">
            <div className="w-8 h-8 rounded-[10px] bg-[#171717] text-white flex items-center justify-center font-black text-sm tracking-tighter">
              C
            </div>
            <span className="font-extrabold text-xl sm:text-2xl tracking-[-0.04em] text-[#171717]">
              CALL
            </span>
          </div>
        </div>

        {/* Direita: Status Ativo + Usuário */}
        <div className="flex items-center justify-end gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-[#FFFFFF] border border-[#E7E6DF] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-[#171717] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#171717] stroke-[1.75]" />
              <span className="truncate max-w-[100px]">{name || 'Conectado'}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
