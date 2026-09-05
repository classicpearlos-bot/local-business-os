'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Bell, Gift, Crown, ChevronDown } from 'lucide-react';
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
    <header className="px-6 sm:px-8 border-b border-[#EFE3CF]/80 bg-[#FAF7F2]/95 backdrop-blur-xl sticky top-0 z-20">
      {/* Row 1: page title + page-level action buttons */}
      {(title || actions) && (
        <div className="flex items-center justify-between py-3 gap-4 border-b border-[#EFE3CF]/50">
          <div className="min-w-0 flex items-center gap-3">
            {title && (
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-sm font-black text-[#1E1B18] truncate">{title}</h1>
                  {badge}
                </div>
                {subtitle && (
                  <p className="text-[10px] text-[#9E968D] font-medium mt-0.5 truncate hidden sm:block">{subtitle}</p>
                )}
              </div>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      )}

      {/* Row 2: global search + global controls */}
      <div className="flex items-center justify-between py-3 gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
              window.dispatchEvent(event);
            }}
            className="w-full h-9 px-4 rounded-full bg-white border border-[#EFE3CF] text-[#8C827A] hover:border-[#DFBE7E] hover:text-[#1E1B18] transition-all flex items-center justify-between text-xs font-medium cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-[#C59E3F]" />
              <span>Search anything...</span>
            </div>
            <kbd className="px-2 py-0.5 text-[10px] font-mono font-semibold text-[#8C827A] bg-[#F7F3EA] rounded-md border border-[#EFE3CF]">⌘ K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/whatsapp">
            <button className="gold-button h-9 px-3 rounded-full flex items-center gap-2 text-xs font-bold cursor-pointer">
              <Crown className="w-3.5 h-3.5 text-[#FAF7F0]" />
              <span className="hidden sm:inline">Upgrade</span>
            </button>
          </Link>
          <Link href="/inbox">
            <button className="relative w-9 h-9 rounded-full bg-white border border-[#EFE3CF] hover:border-[#DFBE7E] flex items-center justify-center text-[#7C756D] hover:text-[#1E1B18] transition-all cursor-pointer shadow-xs">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-[#DFB755] to-[#C59E3F] text-white text-[9px] font-extrabold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </Link>
          <Link href="/campaigns">
            <button className="w-9 h-9 rounded-full bg-white border border-[#EFE3CF] hover:border-[#DFBE7E] flex items-center justify-center text-[#7C756D] hover:text-[#1E1B18] transition-all cursor-pointer shadow-xs">
              <Gift className="w-4 h-4 text-[#C59E3F]" />
            </button>
          </Link>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white border border-[#EFE3CF] shadow-xs">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FDFBF7] to-[#F5EADB] border border-[#D4AF37] flex items-center justify-center">
              <span className="font-serif font-black text-[9px] text-[#B88B2A]">CP</span>
            </div>
            <div className="hidden md:block text-left">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#1E1B18] leading-none">Classic Pearl</span>
                <ChevronDown className="w-3 h-3 text-[#8C827A]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
