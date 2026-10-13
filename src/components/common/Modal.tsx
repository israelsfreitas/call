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
        className="w-full max-w-md rounded-[24px] bg-[#FFFFFF] border border-[#E7E6DF] shadow-[0_24px_60px_rgba(0,0,0,0.08)] overflow-hidden text-[#171717]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E6DF]">
          <h2 className="text-sm font-bold tracking-tight text-[#171717]">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#EFEEE8] hover:bg-[#171717] hover:text-white text-[#171717] flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
