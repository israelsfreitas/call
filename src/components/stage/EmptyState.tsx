import React from 'react';
import { Volume2 } from 'lucide-react';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none transition-colors duration-200">
      <div className="w-16 h-16 rounded-[22px] bg-[#FFFFFF] dark:bg-[#181817] border border-[#E7E6DF] dark:border-[#2A2A28] shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] flex items-center justify-center text-[#171717] dark:text-[#B7FF2A] mb-4">
        <Volume2 size={28} className="stroke-[2]" />
      </div>
      <h2 className="text-xl font-extrabold tracking-tight text-[#171717] dark:text-[#F5F5F0] mb-1.5">
        Selecione uma sala
      </h2>
      <p className="text-xs sm:text-sm text-[#686861] dark:text-[#A3A39C] max-w-sm leading-relaxed">
        Clique em uma das salas na barra lateral à esquerda para entrar na conversa por voz, vídeo ou compartilhamento de tela.
      </p>
    </div>
  );
};
