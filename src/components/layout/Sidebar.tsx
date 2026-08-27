'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox as InboxIcon,
  Users,
  Send,
  Zap,
  FileText,
  BarChart3,
  MessageSquareQuote,
  UserCheck,
  Code2,
  Settings,
  Crown,
  ChevronRight,
  MoreVertical,
  Calendar,
  GitBranch
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { CommandPalette } from './CommandPalette';

interface SidebarProps {
  className?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gupuitxccytwakcscnmi.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable__N76nG2yDTCZXUyvoGoiIA_wv4jm7HR'
);

export function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname();
  const [activeCount, setActiveCount] = useState<number>(12);

  useEffect(() => {
    supabase
      .from('conversations')
      .select('unread_count')
      .gt('unread_count', 0)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const total = data.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
          setActiveCount(total > 0 ? total : 12);
        }
      });
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Inbox', href: '/inbox', icon: InboxIcon, badge: activeCount },
    { label: 'Contacts', href: '/contacts', icon: Users },
    { label: 'Campaigns', href: '/campaigns', icon: Send },
    { label: 'Automations', href: '/automations', icon: Zap },
    { label: 'Flow Studio', href: '/flows', icon: GitBranch },
    { label: 'Appointments', href: '/appointments', icon: Calendar },
    { label: 'Templates', href: '/templates', icon: FileText },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Developers', href: '/developers', icon: Code2 },
    { label: 'Settings', href: '/whatsapp', icon: Settings }
  ];

  return (
    <>
      <CommandPalette />
      <aside className={`w-64 bg-[#FAF7F2] text-[#2C2723] flex flex-col justify-between shrink-0 border-r border-[#EFE3CF] select-none z-20 shadow-xs ${className}`}>
        {/* Brand Crest Header */}
        <div>
          <div className="pt-7 pb-5 px-6 flex flex-col items-center justify-center border-b border-[#EFE3CF]/70">
            <Link href="/" className="flex flex-col items-center text-center group">
              {/* Royal Gold Crest Monogram */}
              <div className="relative mb-2">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FDFBF7] to-[#F5EADB] border-2 border-[#D4AF37] flex items-center justify-center shadow-md shadow-[#C59E3F]/15 group-hover:scale-105 transition-transform duration-200">
                  <div className="relative flex flex-col items-center justify-center">
                    <Crown className="w-4 h-4 text-[#C59E3F] absolute -top-3 drop-shadow-xs" />
                    <span className="font-serif font-black text-xl text-[#B88B2A] tracking-tighter">CP</span>
                  </div>
                </div>
                {/* Subtle Laurel Wreath Ring Accent */}
                <div className="absolute inset-0 rounded-full border border-dashed border-[#D4AF37]/50 animate-spin-slow pointer-events-none" />
              </div>

              <h1 className="font-serif font-extrabold text-lg text-[#1E1B18] tracking-widest mt-1">
                NEXCHAT
              </h1>
              <p className="text-[9px] font-bold tracking-[0.2em] text-[#8C6514] uppercase mt-0.5">
                CLASSIC PEARLS SALON
              </p>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-1 overflow-y-auto max-h-[calc(100vh-270px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group ${
                    isActive
                      ? 'gold-pill-active'
                      : 'text-[#5D564E] hover:text-[#1E1B18] hover:bg-[#F2ECE0]/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#8C6514]' : 'text-[#8C827A] group-hover:text-[#5D564E]'
                    }`} />
                    <span className="tracking-wide">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3DCA9] text-[#6A4A0A] border border-[#E8CE92]">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-[#8C6514]" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Plan Card */}
        <div className="p-3.5 border-t border-[#EFE3CF]/80 space-y-2.5 bg-[#F7F3EA]/90">
          {/* User Profile Card */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/90 border border-[#EFE3CF] shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EBD4A4] to-[#C59E3F] p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                <div className="w-full h-full rounded-full bg-[#2C2723] text-[#DFB755] flex items-center justify-center font-bold text-[10px]">
                  CP
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#1E1B18] truncate leading-tight">Salon Administrator</p>
                <p className="text-[10px] text-[#8C827A] font-medium truncate">Classic Pearls Salon</p>
              </div>
            </div>
            <button className="text-[#8C827A] hover:text-[#1E1B18] p-1 cursor-pointer">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Premium Plan Card */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#FDFBF7] via-[#FAF4E6] to-[#F5EADB] border border-[#DFBE7E]/70 shadow-xs text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#8C6514]">
              <Crown className="w-3.5 h-3.5 text-[#C59E3F]" />
              <span>Premium Plan</span>
            </div>
            <p className="text-[10px] text-[#7C756D] mt-0.5">Expires on 12 Sep, 2026</p>
            <Link 
              href="/whatsapp" 
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B88B2A] hover:text-[#8C6514] mt-1 hover:underline cursor-pointer"
            >
              <span>View Plan Details</span>
              <ChevronRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
