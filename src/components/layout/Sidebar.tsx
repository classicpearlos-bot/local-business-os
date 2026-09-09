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
  GitBranch,
  Sparkles,
  Calendar,
  Settings,
  MoreVertical,
  ChevronRight
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
  const [activeCount, setActiveCount] = useState<number>(0);

  useEffect(() => {
    supabase
      .from('conversations')
      .select('unread_count')
      .gt('unread_count', 0)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const total = data.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
          setActiveCount(total);
        } else {
          setActiveCount(0);
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
    { label: 'Services', href: '/services', icon: Sparkles },
    { label: 'Appointments', href: '/appointments', icon: Calendar },
    { label: 'Templates', href: '/templates', icon: FileText },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/whatsapp', icon: Settings }
  ];

  return (
    <>
      <CommandPalette />
      <aside className={`w-64 bg-white text-[#111111] flex flex-col justify-between shrink-0 border-r border-[#E5E7EB] select-none z-20 ${className}`}>
        {/* Brand Header */}
        <div>
          <div className="pt-10 pb-8 px-8 flex flex-col items-center justify-center">
            <Link href="/" className="flex flex-col items-center text-center group">
              <div className="w-12 h-12 flex items-center justify-center mb-3 transition-transform duration-500 group-hover:scale-105">
                <span className="font-serif font-medium text-4xl tracking-tighter text-[#111111]">Cp</span>
              </div>
              <h1 className="font-serif text-xl text-[#111111] tracking-[0.15em] font-medium">
                NEXCHAT
              </h1>
              <p className="text-[10px] font-light tracking-[0.2em] text-[#71717A] uppercase mt-1">
                Classic Pearl
              </p>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 space-y-0.5 overflow-y-auto max-h-[calc(100vh-270px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-md text-[13px] transition-all duration-300 group relative ${
                    isActive
                      ? 'text-[#111111] font-medium bg-[#FAFAFA]'
                      : 'text-[#71717A] font-light hover:text-[#111111] hover:bg-[#FAFAFA]/50'
                  }`}
                >
                  {/* Minimalist Active Indicator Line */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-[#D4AF37] rounded-r-full" />
                  )}

                  <div className="flex items-center gap-4">
                    <Icon className={`w-[18px] h-[18px] stroke-[1.5] transition-colors ${
                      isActive ? 'text-[#D4AF37]' : 'text-[#A1A1AA] group-hover:text-[#111111]'
                    }`} />
                    <span className="tracking-wide">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-sm bg-[#111111] text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Area */}
        <div className="p-6 mt-auto">
          <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center shrink-0">
                <span className="font-serif text-white font-medium text-sm">J</span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#111111] truncate">Jessica</p>
                <p className="text-[10px] font-light tracking-wide text-[#71717A] uppercase truncate mt-0.5">Owner</p>
              </div>
            </div>
            <button className="text-[#A1A1AA] hover:text-[#111111] transition-colors">
              <MoreVertical className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
