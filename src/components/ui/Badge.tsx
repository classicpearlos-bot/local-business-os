import React from 'react';

export type BadgeVariant = 
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
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
    container: 'bg-slate-800 text-slate-200 border-slate-700/80',
    dot: 'bg-slate-400'
  },
  primary: {
    container: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60 shadow-xs',
    dot: 'bg-indigo-400'
  },
  success: {
    container: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60 shadow-xs',
    dot: 'bg-emerald-400'
  },
  warning: {
    container: 'bg-amber-950/80 text-amber-300 border-amber-800/60 shadow-xs',
    dot: 'bg-amber-400'
  },
  danger: {
    container: 'bg-rose-950/80 text-rose-300 border-rose-800/60 shadow-xs',
    dot: 'bg-rose-400'
  },
  info: {
    container: 'bg-sky-950/80 text-sky-300 border-sky-800/60 shadow-xs',
    dot: 'bg-sky-400'
  },
  neutral: {
    container: 'bg-slate-900 text-slate-100 border-slate-800',
    dot: 'bg-emerald-400'
  },
  outline: {
    container: 'bg-transparent text-slate-300 border-slate-700',
    dot: 'bg-slate-400'
  }
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.2 text-[10px] font-bold',
  md: 'px-2.5 py-0.5 text-xs font-bold'
};

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const styles = variantStyles[variant];
  const sizeCls = sizeStyles[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border tracking-wide select-none ${styles.container} ${sizeCls} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.dot}`} />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${styles.dot}`} />
        </span>
      )}
      {children}
    </span>
  );
}
