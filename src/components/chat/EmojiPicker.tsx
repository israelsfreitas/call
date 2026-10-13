import React from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const COMMON_EMOJIS = [
  '😀', '😂', '😍', '😎', '🔥', '👍', '👎', '🎉',
  '❤️', '👏', '🚀', '💯', '✨', '🤔', '👀', '👋'
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  return (
    <div className="absolute bottom-14 left-4 z-40 p-3 rounded-[20px] bg-[#FFFFFF] dark:bg-[#181817] border border-[#E7E6DF] dark:border-[#2A2A28] shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-150">
      <div className="grid grid-cols-4 gap-2">
        {COMMON_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center text-lg rounded-[10px] hover:bg-[#EFEEE8] dark:hover:bg-[#242422] transition-colors cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
