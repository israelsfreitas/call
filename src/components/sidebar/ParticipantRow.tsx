import React from 'react';
import { Participant } from '../../signaling/protocol';
import { Avatar } from '../common/Avatar';
import { MicOff, Video, Radio } from 'lucide-react';
import { useHubStore } from '../../stores/hubStore';

interface ParticipantRowProps {
  participant: Participant;
}

export const ParticipantRow: React.FC<ParticipantRowProps> = ({ participant }) => {
  const selfId = useHubStore(s => s.selfId);
  const isSelf = participant.id === selfId;

  return (
    <div className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-2 overflow-hidden">
        <Avatar name={participant.name} color={participant.color} size="sm" />
        <span className="text-xs font-medium text-[var(--text)] truncate max-w-[120px]">
          {participant.name} {isSelf && <span className="text-[var(--text-muted)]">(você)</span>}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Selo AO VIVO para transmissão de tela */}
        {participant.screen && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-[var(--danger)] text-white tracking-wider animate-pulse">
            <Radio size={10} />
            AO VIVO
          </span>
        )}

        {/* Câmera ligada */}
        {participant.camera && (
          <Video size={13} className="text-[var(--accent)]" />
        )}

        {/* Microfone mutado */}
        {participant.micMuted && (
          <MicOff size={13} className="text-[var(--danger)]" />
        )}
      </div>
    </div>
  );
};
