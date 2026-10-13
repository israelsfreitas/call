import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  danger?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  active = false,
  danger = false,
  size = 'md',
  className = '',
  tooltip,
  ...props
}) => {
  const sizeClasses = {
    sm: 'p-1.5 rounded-lg',
    md: 'p-2 rounded-xl',
    lg: 'p-3 rounded-2xl'
  };

  let bgClass = 'bg-[var(--neutral-btn)] hover:bg-white/10 text-[var(--text)]';
  if (active) {
    bgClass = 'bg-[var(--accent-on)] text-white hover:opacity-90';
  } else if (danger) {
    bgClass = 'bg-[var(--danger)] text-white hover:opacity-90';
  }

  return (
    <button
      title={tooltip}
      className={`inline-flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--border)] ${sizeClasses[size]} ${bgClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
