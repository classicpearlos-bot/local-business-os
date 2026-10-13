import React from 'react';

export type BadgeVariant = 
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'gold'
  | 'purple'
  | 'outline';

export type BadgeSize = 'sm' | 'md';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  default: {
    container: 'bg-slate-100 text-slate-700 border-slate-200/80 shadow-xs',
    dot: 'bg-slate-500'
  },
  primary: {
    container: 'bg-amber-50 text-amber-900 border-amber-200/80 shadow-xs font-semibold',
    dot: 'bg-amber-500'
  },
  gold: {
    container: 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 border-amber-200 shadow-xs font-semibold',
    dot: 'bg-amber-500'
  },
  purple: {
    container: 'bg-purple-50 text-purple-700 border-purple-200 shadow-xs',
    dot: 'bg-purple-500'
  },
  success: {
    container: 'bg-emerald-50 text-emerald-800 border-emerald-200/90 shadow-xs font-semibold',
    dot: 'bg-emerald-500'
  },
  warning: {
    container: 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs font-semibold',
    dot: 'bg-amber-500'
  },
  danger: {
    container: 'bg-rose-50 text-rose-800 border-rose-200 shadow-xs font-semibold',
    dot: 'bg-rose-500'
  },
  info: {
    container: 'bg-sky-50 text-sky-800 border-sky-200 shadow-xs font-semibold',
    dot: 'bg-sky-500'
  },
  neutral: {
    container: 'bg-slate-50 text-slate-600 border-slate-200',
    dot: 'bg-slate-400'
  },
  outline: {
    container: 'bg-transparent text-slate-600 border-slate-300',
    dot: 'bg-slate-400'
  }
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] font-bold rounded-full',
  md: 'px-2.5 py-1 text-xs font-bold rounded-full'
};

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  className = '',
  ...props
}: BadgeProps) {
  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 border leading-none transition-colors ${styles.container} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${styles.dot}`} />
        </span>
      )}
      {children}
    </span>
  );
}
