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
    container: 'bg-slate-100 text-slate-700 border-slate-200/80',
    dot: 'bg-slate-500'
  },
  primary: {
    container: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    dot: 'bg-indigo-600'
  },
  success: {
    container: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dot: 'bg-emerald-500'
  },
  warning: {
    container: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dot: 'bg-amber-500'
  },
  danger: {
    container: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-500'
  },
  info: {
    container: 'bg-sky-50 text-sky-700 border-sky-200/80',
    dot: 'bg-sky-500'
  },
  neutral: {
    container: 'bg-slate-900 text-white border-slate-800',
    dot: 'bg-emerald-400'
  },
  outline: {
    container: 'bg-transparent text-slate-600 border-slate-300',
    dot: 'bg-slate-400'
  }
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.2 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs'
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
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border tracking-wide select-none ${styles.container} ${sizeCls} ${className}`}
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
