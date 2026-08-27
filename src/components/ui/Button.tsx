import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'whatsapp'
  | 'dark'
  | 'warning';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'gold-button text-white shadow-md shadow-[#C59E3F]/25 border border-[#DFB755] active:scale-95',
  secondary: 'bg-[#F2ECE0] text-[#3E2D12] hover:bg-[#EBE3D3] active:bg-[#E2D7C3] border border-[#DFBE7E]/60 shadow-xs active:scale-95',
  outline: 'bg-white text-[#5D564E] hover:bg-[#FAF7F2] hover:text-[#1E1B18] active:bg-[#F2ECE0] border border-[#EFE3CF] hover:border-[#DFBE7E] shadow-xs active:scale-95',
  ghost: 'bg-transparent text-[#7C756D] hover:text-[#1E1B18] hover:bg-[#F2ECE0]/70 border border-transparent',
  danger: 'bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-500 hover:to-rose-600 shadow-md shadow-rose-600/20 border border-rose-400/20 active:scale-95',
  whatsapp: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:from-emerald-500 hover:to-teal-600 shadow-md shadow-emerald-600/20 border border-emerald-400/20 active:scale-95',
  dark: 'bg-[#1E1B2E] text-white hover:bg-[#2A263D] active:bg-[#0D0A14] shadow-sm border border-[#DFBE7E]/30',
  warning: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20 border border-amber-400/20 active:scale-95'
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5 font-bold',
  md: 'px-4 py-2 text-sm rounded-xl gap-2 font-bold',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5 font-black',
  icon: 'p-2 text-sm rounded-xl'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    isLoading = false, 
    disabled, 
    leftIcon, 
    rightIcon, 
    children, 
    className = '', 
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center transition-all duration-200 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
