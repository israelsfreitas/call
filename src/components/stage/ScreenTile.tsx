import React, { useRef, useEffect } from 'react';
import { Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { useRoomStore } from '../../stores/roomStore';

interface ScreenTileProps {
  peerId: string;
  authorName: string;
  isSelf: boolean;
  videoStream: MediaStream | null;
  audioStream: MediaStream | null;
  hasAudioTrack: boolean;
  isSpotlight: boolean;
  onToggleSpotlight: () => void;
}

export const ScreenTile: React.FC<ScreenTileProps> = ({
  peerId,
  authorName,
  isSelf,
  videoStream,
  audioStream,
  hasAudioTrack,
  isSpotlight,
  onToggleSpotlight
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const peerMedia = useRoomStore(s => s.peerMedia[peerId]);
  const screenVolume = peerMedia?.screenVolume ?? 1;
  const isAudioMuted = peerMedia?.screenAudioMuted ?? true;

  const { setPeerScreenVolume, setPeerScreenAudioMuted } = useRoomStore();

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  useEffect(() => {
    if (!isSelf && audioRef.current && audioStream) {
      audioRef.current.srcObject = audioStream;
      audioRef.current.muted = isAudioMuted;
      audioRef.current.volume = screenVolume;
      audioRef.current.play().catch(() => {});
    }
  }, [isSelf, audioStream, isAudioMuted, screenVolume]);

  const handleToggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPeerScreenAudioMuted(peerId, !isAudioMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setPeerScreenVolume(peerId, val);
  };

  const progressPct = isAudioMuted ? 0 : Math.round(screenVolume * 100);

  return (
    <div
      ref={containerRef}
      onClick={onToggleSpotlight}
      className={`relative aspect-video rounded-[24px] overflow-hidden bg-[#171717] border transition-all cursor-pointer flex items-center justify-center group ${
        isSpotlight
          ? 'border-[#171717] ring-4 ring-[#B7FF2A]/50 shadow-[0_12px_40px_rgba(0,0,0,0.12)]'
          : 'border-[#E7E6DF] hover:border-[#DCDCD4] shadow-[0_4px_20px_rgba(0,0,0,0.04)]'
      }`}
      title={isSpotlight ? 'Clique para ver todos os quadros' : 'Clique para focar esta tela'}
    >
      {/* Áudio da tela remoto */}
      {!isSelf && <audio ref={audioRef} autoPlay playsInline />}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className="w-full h-full object-contain"
      />

      {/* Label: Nome · tela */}
      <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171717]/85 backdrop-blur-md text-white text-xs font-semibold shadow-sm pointer-events-none border border-white/10">
        <span className="truncate max-w-[150px]">{authorName} · tela</span>
      </div>

      {/* Controles de Topo: Volume, Mutar/Ativar som, Foco */}
      <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
        {!isSelf && hasAudioTrack && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFFFFF] text-[#171717] shadow-md border border-[#E7E6DF] text-xs"
          >
            <button
              onClick={handleToggleAudio}
              className="p-1 rounded-full hover:bg-[#EFEEE8] transition-colors cursor-pointer"
              title={isAudioMuted ? 'Ativar som da tela' : 'Silenciar som da tela'}
            >
              {isAudioMuted ? <VolumeX size={14} className="text-rose-600" /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isAudioMuted ? 0 : screenVolume}
              onChange={handleVolumeChange}
              style={{
                background: `linear-gradient(to right, #171717 ${progressPct}%, #EFEEE8 ${progressPct}%)`
              }}
              className="player-scrubber w-16 h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none"
              title={`Volume da tela: ${Math.round(screenVolume * 100)}%`}
            />
          </div>
        )}

        {/* Botão de Foco / Spotlight */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSpotlight();
          }}
          title={isSpotlight ? 'Reduzir / Ver todos lado a lado' : 'Focar esta tela'}
          className="p-2 rounded-full bg-[#171717]/85 hover:bg-[#171717] text-white opacity-0 group-hover:opacity-100 transition-opacity tactile-btn cursor-pointer shadow-sm border border-white/10"
        >
          {isSpotlight ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>
      </div>
    </div>
  );
};
