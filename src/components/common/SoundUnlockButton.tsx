import React from 'react';
import { Volume2 } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

export const SoundUnlockButton: React.FC = () => {
  const { soundUnlockNeeded, setSoundUnlockNeeded } = useUIStore();

  if (!soundUnlockNeeded) return null;

  const handleUnlock = () => {
    const audios = document.querySelectorAll('audio');
    audios.forEach((audio) => {
      audio.play().catch(() => {});
    });
    setSoundUnlockNeeded(false);
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <button
        onClick={handleUnlock}
        className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#B7FF2A] hover:bg-[#A6EC1F] text-[#171717] font-semibold text-xs tracking-tight shadow-[0_4px_16px_rgba(183,255,42,0.35)] tactile-btn cursor-pointer border border-[#E7E6DF]"
      >
        <Volume2 size={16} className="stroke-[2.5]" />
        <span>Clique para ativar o áudio</span>
      </button>
    </div>
  );
};
