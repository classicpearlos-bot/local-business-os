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
    container: 'bg-[#F2ECE0] text-[#3E2D12] border-[#DFBE7E]/60 shadow-xs',
    dot: 'bg-[#C59E3F]'
  },
  primary: {
    container: 'bg-[#FDF4E2] text-[#8C6514] border-[#EBD4A4] shadow-xs',
    dot: 'bg-[#D4AF37]'
  },
  gold: {
    container: 'bg-gradient-to-r from-[#FDF6E2] to-[#F5E5C9] text-[#7A5714] border-[#DFBE7E] shadow-xs',
    dot: 'bg-[#C59E3F]'
  },
  purple: {
    container: 'bg-[#F3E8FF] text-[#6B21A8] border-[#D8B4FE] shadow-xs',
    dot: 'bg-[#9333EA]'
  },
  success: {
    container: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0] shadow-xs',
    dot: 'bg-[#10B981]'
  },
  warning: {
    container: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A] shadow-xs',
    dot: 'bg-[#F59E0B]'
  },
  danger: {
    container: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA] shadow-xs',
    dot: 'bg-[#EF4444]'
  },
  info: {
    container: 'bg-[#F0F9FF] text-[#075985] border-[#BAE6FD] shadow-xs',
    dot: 'bg-[#0EA5E9]'
  },
  neutral: {
    container: 'bg-[#FAF7F2] text-[#5D564E] border-[#EFE3CF]',
    dot: 'bg-[#7C756D]'
  },
  outline: {
    container: 'bg-transparent text-[#7C756D] border-[#EFE3CF]',
    dot: 'bg-[#C59E3F]'
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
