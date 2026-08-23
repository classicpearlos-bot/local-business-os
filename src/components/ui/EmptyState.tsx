import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">{title}</h3>
      <p className="text-xs text-slate-500 font-medium max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} leftIcon={actionIcon} size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
