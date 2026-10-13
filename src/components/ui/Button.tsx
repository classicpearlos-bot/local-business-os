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
  primary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 shadow-sm shadow-slate-900/10 border border-slate-900/10 font-semibold',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 shadow-xs font-semibold',
  outline: 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 border border-slate-300 shadow-xs font-semibold',
  ghost: 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent font-medium',
  danger: 'bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-500 hover:to-rose-600 shadow-sm shadow-rose-600/20 border border-rose-500/30 font-semibold',
  whatsapp: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:from-emerald-500 hover:to-teal-600 shadow-sm shadow-emerald-600/20 border border-emerald-500/30 font-semibold',
  dark: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 shadow-sm border border-slate-800',
  warning: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-400 hover:to-amber-500 shadow-sm shadow-amber-500/20 border border-amber-400/30 font-semibold'
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
