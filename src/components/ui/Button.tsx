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
  primary: 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500 shadow-md shadow-indigo-600/30 border border-indigo-400/20 active:scale-95',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 shadow-xs active:scale-95',
  outline: 'bg-transparent text-slate-200 hover:bg-slate-800/80 active:bg-slate-900 border border-slate-700 shadow-xs active:scale-95',
  ghost: 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent',
  danger: 'bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-500 hover:to-rose-600 shadow-md shadow-rose-600/30 border border-rose-500/20 active:scale-95',
  whatsapp: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:from-emerald-500 hover:to-teal-600 shadow-md shadow-emerald-600/30 border border-emerald-400/20 active:scale-95',
  dark: 'bg-slate-900 text-white hover:bg-slate-850 active:bg-black shadow-sm border border-slate-800',
  warning: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-500 hover:to-amber-600 shadow-md shadow-amber-600/30 border border-amber-400/20 active:scale-95'
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
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
