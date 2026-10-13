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
    <header className="px-6 lg:px-8 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 transition-all">
      {/* Row 1: page title + page-level action buttons */}
      {(title || actions) && (
        <div className="flex items-center justify-between py-4 border-b border-slate-100">
          <div className="min-w-0 flex items-center gap-4">
            {title && (
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">{title}</h1>
                  {badge}
                </div>
                {subtitle && (
                  <p className="text-xs text-slate-500 font-normal mt-0.5 truncate hidden sm:block">{subtitle}</p>
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
      <div className="flex items-center justify-between py-3 gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
              window.dispatchEvent(event);
            }}
            className="w-full h-9 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-white transition-all flex items-center justify-between text-xs font-medium cursor-text shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">Search campaigns, contacts, templates...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white rounded border border-slate-200 shadow-2xs">⌘ K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/inbox">
            <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </button>
          </Link>
          <Link href="/campaigns">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              <Gift className="w-4 h-4" />
            </button>
          </Link>
          <div className="h-4 w-px bg-slate-200 mx-1" />
          <Link href="/whatsapp">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                CP
              </div>
              <div className="hidden md:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Classic Pearl</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" title="Meta Connected" />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Unisex Salon</p>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5 hidden md:block" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}