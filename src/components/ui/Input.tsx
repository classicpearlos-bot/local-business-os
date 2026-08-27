import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-[#5D564E] uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-[#8C827A] pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-medium text-[#1E1B18] placeholder:text-[#9E968D] transition-all outline-none focus:ring-1 focus:ring-[#C59E3F] focus:border-[#C59E3F] disabled:bg-[#FAF7F2] disabled:text-[#8C827A] disabled:cursor-not-allowed ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-[#EFE3CF] focus:border-[#C59E3F]'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-[#8C827A] flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs font-semibold text-rose-500 mt-1.5">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#7C756D] font-medium mt-1.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-bold text-[#5D564E] uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-medium text-[#1E1B18] placeholder:text-[#9E968D] transition-all outline-none focus:ring-1 focus:ring-[#C59E3F] focus:border-[#C59E3F] disabled:bg-[#FAF7F2] disabled:text-[#8C827A] disabled:cursor-not-allowed ${
            error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-[#EFE3CF] focus:border-[#C59E3F]'
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-xs font-semibold text-rose-500 mt-1.5">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#7C756D] font-medium mt-1.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
