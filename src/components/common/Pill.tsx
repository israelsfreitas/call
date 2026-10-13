import React from 'react';

interface PillProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Pill: React.FC<PillProps> = ({
  children,
  active = false,
  className = '',
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-[var(--border)] transition-all ${
        active
          ? 'bg-[var(--panel-strong)] text-[var(--accent)] border-[var(--accent)]/40 shadow-sm'
          : 'bg-[var(--panel)] text-[var(--text-muted)] hover:text-[var(--text)]'
      } ${onClick ? 'cursor-pointer hover:bg-white/5' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
