import React from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { MessageList } from '../chat/MessageList';
import { ChatInput } from '../chat/ChatInput';
import { MessageSquare } from 'lucide-react';

export const ChatPanel: React.FC = () => {
  const { currentRoom } = useRoomStore();

  return (
    <aside className="w-72 sm:w-80 h-full flex flex-col border-l border-[#E7E6DF] dark:border-[#2A2A28] bg-[#F7F6F0] dark:bg-[#0F0F0E] shrink-0 overflow-hidden z-20 transition-colors duration-200">
      {/* Cabeçalho do Chat */}
      <div className="h-14 px-4 border-b border-[#E7E6DF] dark:border-[#2A2A28] bg-[#FFFFFF] dark:bg-[#181817] flex items-center justify-between shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div className="flex items-center gap-2 overflow-hidden">
          <MessageSquare className="w-4 h-4 text-[#171717] dark:text-[#B7FF2A] stroke-[2]" />
          <h2 className="text-xs font-bold text-[#171717] dark:text-[#F5F5F0] truncate uppercase tracking-wider">
            {currentRoom ? `Chat • ${currentRoom.name}` : 'Chat da Sala'}
          </h2>
        </div>
      </div>

      {/* Lista de Mensagens */}
      <MessageList />

      {/* Campo de Envio */}
      <ChatInput />
    </aside>
  );
};
