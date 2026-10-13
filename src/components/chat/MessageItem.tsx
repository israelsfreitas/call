import React from 'react';
import { ChatMessage } from '../../signaling/protocol';
import { Avatar } from '../common/Avatar';

interface MessageItemProps {
  message: ChatMessage;
}

const EMOJI_REGEX = /^(\p{Extended_Pictographic}|\s)+$/u;

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const date = new Date(message.ts);
  const formattedDate = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const textTrimmed = message.text.trim();
  const isEmojiOnly = EMOJI_REGEX.test(textTrimmed) && Array.from(textTrimmed).length <= 6;

  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#171717] underline decoration-[#B7FF2A] decoration-2 hover:bg-[#B7FF2A]/20 transition-colors break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex items-start gap-2.5 py-1 px-1.5 rounded-[14px] hover:bg-[#FFFFFF]/70 transition-colors group">
      <Avatar name={message.authorName} color={message.authorColor} size="sm" className="mt-0.5" />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-[#171717] truncate">
            {message.authorName}
          </span>
          <span className="text-[10px] text-[#92928A] font-mono shrink-0">
            {formattedDate}
          </span>
        </div>

        <div className="mt-0.5">
          {isEmojiOnly ? (
            <div className="text-2xl leading-snug select-text">
              {textTrimmed}
            </div>
          ) : (
            <div className="inline-block px-3 py-1.5 rounded-[16px] rounded-tl-sm bg-[#FFFFFF] border border-[#E7E6DF] text-xs text-[#171717] leading-relaxed break-words max-w-[95%] select-text shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
              {renderMessageText(message.text)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
