'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Bell, Sparkles, Phone, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, badge, actions }: TopBarProps) {
  return (
    <header className="px-6 sm:px-8 py-5 border-b border-slate-800 bg-[#090D16]/90 backdrop-blur-xl sticky top-0 z-20 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          {title && <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{title}</h1>}
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 font-medium mt-1 leading-normal">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
