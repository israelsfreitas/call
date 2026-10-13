import React from 'react';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  className = ''
}) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs rounded-[10px]',
    md: 'w-9 h-9 text-xs rounded-[12px]',
    lg: 'w-12 h-12 text-sm font-semibold rounded-[16px]',
    xl: 'w-20 h-20 text-3xl font-extrabold rounded-[24px]'
  };

  return (
    <div
      className={`bg-[#171717] text-white flex items-center justify-center shrink-0 border border-[#E7E6DF] select-none ${sizeClasses[size]} ${className}`}
    >
      {initial}
    </div>
  );
};
