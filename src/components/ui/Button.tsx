import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'whatsapp'
  | 'dark';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm shadow-indigo-600/20 border border-transparent',
  secondary: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-100',
  outline: 'bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border border-slate-200 shadow-xs',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm shadow-rose-600/20 border border-transparent',
  whatsapp: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/20 border border-transparent',
  dark: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-black shadow-sm border border-transparent'
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5 font-semibold',
  md: 'px-4 py-2 text-sm rounded-xl gap-2 font-semibold',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5 font-bold',
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
