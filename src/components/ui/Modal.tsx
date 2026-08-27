'use client';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog Body */}
      <div 
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl border border-[#EFE3CF] text-[#1E1B18] overflow-hidden z-10 animate-in zoom-in-95 duration-200`}
      >
        {(title || description) && (
          <div className="px-6 py-5 border-b border-[#EFE3CF] flex items-start justify-between bg-[#FAF7F2]">
            <div>
              {title && <h2 className="text-lg font-black text-white tracking-tight">{title}</h2>}
              {description && <p className="text-xs text-[#7C756D] font-medium mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-[#7C756D] hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
