import React from 'react';

interface AvatarProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy';
  className?: string;
}

const sizeStyles = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-14 h-14 text-base'
};

const statusColors = {
  online: 'bg-emerald-500',
  offline: 'bg-slate-400',
  busy: 'bg-amber-500'
};

function hashColor(str: string = 'User'): string {
  const colors = [
    'from-indigo-500 to-indigo-600 text-white',
    'from-emerald-500 to-teal-600 text-white',
    'from-purple-500 to-pink-600 text-white',
    'from-sky-500 to-blue-600 text-white',
    'from-amber-500 to-orange-600 text-white'
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
}

export function Avatar({ name = 'U', size = 'md', status, className = '' }: AvatarProps) {
  const initials = name
    .trim()
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const colorClass = hashColor(name);

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={`rounded-full bg-gradient-to-br flex items-center justify-center font-bold shadow-xs select-none ${sizeStyles[size]} ${colorClass} ${className}`}
      >
        {initials}
      </div>
      {status && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#0D131F] ${statusColors[status]}`}
        />
      )}
    </div>
  );
}
