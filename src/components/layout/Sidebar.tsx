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
      <aside className={`w-64 bg-white text-slate-900 flex flex-col justify-between shrink-0 border-r border-slate-200/80 select-none z-20 ${className}`}>
        {/* Brand Header */}
        <div>
          <div className="pt-8 pb-6 px-6">
            <Link href="/" className="flex items-center gap-3.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-center font-serif font-black text-lg shadow-sm shadow-amber-500/20 transition-transform duration-300 group-hover:scale-105">
                CP
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-sm text-slate-900 tracking-tight leading-none group-hover:text-amber-600 transition-colors">
                  Classic Pearl
                </h1>
                <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-1">
                  Salon & Spa OS
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-700'
                    }`} />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-700'
                      }`}>
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
        <div className="p-4 border-t border-slate-100 mt-auto">
          <Link href="/whatsapp" className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                CP
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Classic Pearl</p>
                <p className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Meta Connected
                </p>
              </div>
            </div>
            <Settings className="w-4 h-4 text-slate-400 hover:text-slate-700 transition-colors" />
          </Link>
        </div>
      </aside>
    </>
  );
}
