'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Bell, Gift, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, badge, actions }: TopBarProps) {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    supabase
      .from('conversations')
      .select('unread_count')
      .gt('unread_count', 0)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const total = data.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
          setUnreadCount(total);
        } else {
          setUnreadCount(0);
        }
      });
  }, []);

  return (
    <header className="px-8 border-b border-[#E5E7EB] bg-white sticky top-0 z-20">
      {/* Row 1: page title + page-level action buttons */}
      {(title || actions) && (
        <div className="flex items-center justify-between py-5 border-b border-[#E5E7EB]/50">
          <div className="min-w-0 flex items-center gap-4">
            {title && (
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-serif font-medium text-[#111111] tracking-wide truncate">{title}</h1>
                  {badge}
                </div>
                {subtitle && (
                  <p className="text-[11px] text-[#71717A] tracking-wider uppercase mt-1 truncate hidden sm:block">{subtitle}</p>
                )}
              </div>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3 shrink-0">{actions}</div>
          )}
        </div>
      )}

      {/* Row 2: global search + global controls */}
      <div className="flex items-center justify-between py-4 gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
              window.dispatchEvent(event);
            }}
            className="w-full h-10 px-4 rounded-md bg-[#FAFAFA] border border-[#E5E7EB] text-[#A1A1AA] hover:border-[#D1D5DB] hover:bg-white transition-all flex items-center justify-between text-sm font-light cursor-text"
          >
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 text-[#71717A] stroke-[1.5]" />
              <span className="tracking-wide">Search anything...</span>
            </div>
            <kbd className="px-2 py-0.5 text-[10px] font-mono text-[#A1A1AA] bg-white rounded border border-[#E5E7EB]">⌘ K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/inbox">
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#71717A] hover:text-[#111111] hover:bg-[#FAFAFA] transition-colors">
              <Bell className="w-[18px] h-[18px] stroke-[1.5]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#111111]" />
              )}
            </button>
          </Link>
          <Link href="/campaigns">
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-[#71717A] hover:text-[#111111] hover:bg-[#FAFAFA] transition-colors">
              <Gift className="w-[18px] h-[18px] stroke-[1.5]" />
            </button>
          </Link>
          <div className="h-4 w-px bg-[#E5E7EB] mx-1" />
          <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#FAFAFA] transition-colors cursor-pointer">
            <div className="w-6 h-6 flex items-center justify-center">
              <span className="font-serif font-medium text-[11px] text-[#111111]">Cp</span>
            </div>
            <div className="hidden md:block text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[#111111] tracking-wide">Classic Pearl</span>
                <ChevronDown className="w-3 h-3 text-[#A1A1AA] stroke-[1.5]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
}
