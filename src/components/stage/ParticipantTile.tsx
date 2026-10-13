import React, { useRef, useEffect } from 'react';
import { Participant } from '../../signaling/protocol';
import { Avatar } from '../common/Avatar';
import { MicOff, Maximize, Minimize } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

interface ParticipantTileProps {
  participant: Participant;
  isSelf: boolean;
  videoStream: MediaStream | null;
  audioStream: MediaStream | null;
  isSpeaking: boolean;
  isSpotlight: boolean;
  onToggleSpotlight: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isSelf,
  videoStream,
  audioStream,
  isSpeaking,
  isSpotlight,
  onToggleSpotlight,
  onVisibilityChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { setSoundUnlockNeeded } = useUIStore();

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  useEffect(() => {
    if (!isSelf && audioRef.current && audioStream) {
      audioRef.current.srcObject = audioStream;
      audioRef.current.play().catch((err) => {
        if (err.name === 'NotAllowedError') {
          setSoundUnlockNeeded(true);
        }
      });
    }
  }, [isSelf, audioStream, setSoundUnlockNeeded]);

  useEffect(() => {
    if (isSelf || !onVisibilityChange || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          onVisibilityChange(entry.isIntersecting && !document.hidden);
        });
      },
      { threshold: 0.1 }
    );

    const handleVisibilityChange = () => {
      onVisibilityChange(!document.hidden);
    };

    observer.observe(containerRef.current);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSelf, onVisibilityChange]);

  const hasVideo = !!videoStream && participant.camera;

  return (
    <div
      ref={containerRef}
      onClick={onToggleSpotlight}
      className={`relative aspect-video rounded-[24px] overflow-hidden bg-[#FFFFFF] border transition-all cursor-pointer flex items-center justify-center group ${
        isSpeaking
          ? 'border-[#171717] ring-4 ring-[#B7FF2A]/50 shadow-[0_8px_30px_rgba(0,0,0,0.06)]'
          : isSpotlight
          ? 'border-[#171717] shadow-[0_8px_30px_rgba(0,0,0,0.05)] ring-2 ring-[#171717]'
          : 'border-[#E7E6DF] hover:border-[#DCDCD4] shadow-[0_4px_20px_rgba(0,0,0,0.015)]'
      }`}
      title={isSpotlight ? 'Clique para ver todos os quadros' : 'Clique para focar este quadro'}
    >
      {/* Áudio Remoto */}
      {!isSelf && <audio ref={audioRef} autoPlay playsInline />}

      {/* Vídeo ou Avatar */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className={`w-full h-full object-cover ${isSelf ? '-scale-x-100' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-4">
          <Avatar name={participant.name} color={participant.color} size="xl" />
        </div>
      )}

      {/* Pill com Nome no canto superior esquerdo */}
      <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171717]/80 backdrop-blur-md text-white text-xs font-semibold shadow-sm pointer-events-none">
        {participant.micMuted && (
          <MicOff size={12} className="text-rose-400" />
        )}
        <span className="truncate max-w-[130px]">
          {participant.name} {isSelf && '(você)'}
        </span>
      </div>

      {/* Botão de Toggle Foco / Spotlight */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSpotlight();
        }}
        title={isSpotlight ? 'Reduzir / Ver todos lado a lado' : 'Focar este vídeo'}
        className="absolute top-3.5 right-3.5 p-2 rounded-full bg-[#171717]/80 hover:bg-[#171717] text-white opacity-0 group-hover:opacity-100 transition-opacity tactile-btn cursor-pointer shadow-sm"
      >
        {isSpotlight ? <Minimize size={14} /> : <Maximize size={14} />}
      </button>
    </div>
  );
};
