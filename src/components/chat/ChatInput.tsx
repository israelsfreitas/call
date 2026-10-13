import React, { useState } from 'react';
import { Smile, Send } from 'lucide-react';
import { useRoomStore } from '../../stores/roomStore';
import { useHubStore } from '../../stores/hubStore';
import { signalingClient } from '../../signaling/client';
import { EmojiPicker } from './EmojiPicker';

export const ChatInput: React.FC = () => {
  const { currentRoom } = useRoomStore();
  const [text, setText] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !currentRoom) return;

    // Despacho otimista imediato
    const hubState = useHubStore.getState();
    const selfId = hubState.selfId || hubState.clientId || 'anonymous';
    const selfName = hubState.name || 'Anônimo';
    const selfColor = hubState.color || '#171717';

    useRoomStore.getState().addChatMessage({
      id: crypto.randomUUID(),
      roomId: currentRoom.id,
      authorId: selfId,
      authorName: selfName,
      authorColor: selfColor,
      text: trimmed,
      ts: Date.now()
    });

    signalingClient.send({
      type: 'chat-send',
      text: trimmed.slice(0, 500)
    });

    setText('');
    setIsEmojiOpen(false);
  };

  const handleAddEmoji = (emoji: string) => {
    setText(prev => (prev + emoji).slice(0, 500));
  };

  if (!currentRoom) {
    return (
      <div className="p-3 border-t border-[#E7E6DF] dark:border-[#2A2A28] bg-[#FFFFFF] dark:bg-[#181817] shrink-0">
        <input
          disabled
          placeholder="Entre numa sala para conversar"
          className="w-full px-3 py-2 rounded-[14px] bg-[#EFEEE8] dark:bg-[#242422] border border-[#E7E6DF] dark:border-[#2A2A28] text-xs text-[#92928A] dark:text-[#73736C] cursor-not-allowed"
        />
      </div>
    );
  }

  return (
    <div className="p-3 border-t border-[#E7E6DF] dark:border-[#2A2A28] bg-[#FFFFFF] dark:bg-[#181817] shrink-0 relative transition-colors duration-200">
      {isEmojiOpen && (
        <EmojiPicker
          onSelect={handleAddEmoji}
          onClose={() => setIsEmojiOpen(false)}
        />
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEmojiOpen(prev => !prev)}
          title="Inserir emoji"
          className="p-2 rounded-[12px] text-[#686861] dark:text-[#A3A39C] hover:text-[#171717] dark:hover:text-[#F5F5F0] hover:bg-[#EFEEE8] dark:hover:bg-[#242422] transition-colors cursor-pointer border border-[#E7E6DF] dark:border-[#2A2A28]"
        >
          <Smile size={16} />
        </button>

        <input
          type="text"
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Mensagem em ${currentRoom.name}`}
          className="flex-1 px-3 py-2 rounded-[14px] bg-[#F7F6F0] dark:bg-[#242422] border border-[#E7E6DF] dark:border-[#2A2A28] text-xs text-[#171717] dark:text-[#F5F5F0] placeholder-[#92928A] dark:placeholder-[#73736C] focus:outline-none focus:border-[#171717] dark:focus:border-[#B7FF2A] focus:ring-2 focus:ring-[#B7FF2A]/20 transition-all"
        />

        <button
          type="submit"
          disabled={!text.trim()}
          title="Enviar"
          className="p-2 rounded-[12px] bg-[#B7FF2A] hover:bg-[#A6EC1F] text-[#171717] disabled:opacity-40 disabled:cursor-not-allowed transition-all tactile-btn cursor-pointer font-bold shadow-[0_2px_8px_rgba(183,255,42,0.3)]"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};
