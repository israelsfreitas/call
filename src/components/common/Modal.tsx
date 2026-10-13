import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-[24px] bg-[#FFFFFF] dark:bg-[#181817] border border-[#E7E6DF] dark:border-[#2A2A28] shadow-[0_24px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)] overflow-hidden text-[#171717] dark:text-[#F5F5F0] transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E6DF] dark:border-[#2A2A28]">
          <h2 className="text-sm font-bold tracking-tight text-[#171717] dark:text-[#F5F5F0]">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#EFEEE8] dark:bg-[#242422] hover:bg-[#171717] dark:hover:bg-[#B7FF2A] hover:text-white dark:hover:text-[#171717] text-[#171717] dark:text-[#F5F5F0] flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
