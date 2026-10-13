import React, { useRef, useEffect } from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { MessageItem } from './MessageItem';

export const MessageList: React.FC = () => {
  const { messages, currentRoom } = useRoomStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  // Auto scroll para o final caso o usuário não tenha rolado para cima
  useEffect(() => {
    if (!userScrolledUp.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Se o usuário rolou para cima (mais de 60px do fim)
    userScrolledUp.current = scrollHeight - (scrollTop + clientHeight) > 60;
  };

  if (!currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-[var(--text-muted)] select-none">
        Entre numa sala para conversar
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-[var(--text-muted)] select-none">
        Nenhuma mensagem ainda. Envie a primeira!
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-3 flex flex-col gap-2"
    >
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
    </div>
  );
};
