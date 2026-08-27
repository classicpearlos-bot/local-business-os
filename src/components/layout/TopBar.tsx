'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Bell, Gift, Crown, ChevronDown, Sparkles } from 'lucide-react';

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, badge, actions }: TopBarProps) {
  return (
    <header className="px-6 sm:px-8 py-3.5 border-b border-[#EFE3CF]/80 bg-[#FAF7F2]/80 backdrop-blur-xl sticky top-0 z-20 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Search Bar matching the design */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
            window.dispatchEvent(event);
          }}
          className="w-full h-10 px-4 rounded-full bg-white border border-[#EFE3CF] text-[#8C827A] hover:border-[#DFBE7E] hover:text-[#1E1B18] transition-all flex items-center justify-between text-xs font-medium cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-3.5 h-3.5 text-[#C59E3F]" />
            <span>Search anything...</span>
          </div>
          <kbd className="px-2 py-0.5 text-[10px] font-mono font-semibold text-[#8C827A] bg-[#F7F3EA] rounded-md border border-[#EFE3CF]">
            ⌘ K
          </kbd>
        </button>
      </div>

      {/* Header Actions matching the mockup */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Upgrade Plan Gold Pill Button */}
        <Link href="/whatsapp">
          <button className="gold-button h-10 px-4 rounded-full flex items-center gap-2 text-xs font-bold cursor-pointer">
            <Crown className="w-3.5 h-3.5 text-[#FAF7F0] drop-shadow-xs" />
            <span>Upgrade Plan</span>
          </button>
        </Link>

        {/* Notification Bell */}
        <button className="relative w-10 h-10 rounded-full bg-white border border-[#EFE3CF] hover:border-[#DFBE7E] flex items-center justify-center text-[#7C756D] hover:text-[#1E1B18] transition-all cursor-pointer shadow-xs">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-[#DFB755] to-[#C59E3F] text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs">
            3
          </span>
        </button>

        {/* Gift / Rewards Icon */}
        <button className="w-10 h-10 rounded-full bg-white border border-[#EFE3CF] hover:border-[#DFBE7E] flex items-center justify-center text-[#7C756D] hover:text-[#1E1B18] transition-all cursor-pointer shadow-xs">
          <Gift className="w-4 h-4 text-[#C59E3F]" />
        </button>

        {/* Organization Selector Pill */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-[#EFE3CF] shadow-xs">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FDFBF7] to-[#F5EADB] border border-[#D4AF37] flex items-center justify-center shadow-xs">
            <span className="font-serif font-black text-[10px] text-[#B88B2A]">CP</span>
          </div>
          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-[#1E1B18] leading-none">Classic Pearls Salon</span>
              <ChevronDown className="w-3 h-3 text-[#8C827A]" />
            </div>
            <p className="text-[9px] text-[#8C6514] font-medium leading-tight mt-0.5">Premium Plan</p>
          </div>
        </div>
      </div>
    </header>
  );
}
