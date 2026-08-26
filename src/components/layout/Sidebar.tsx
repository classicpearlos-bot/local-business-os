'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Users,
  Megaphone,
  FileText,
  Zap,
  Phone,
  Code2,
  BarChart3,
  Command,
  Image as ImageIcon,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { CommandPalette } from './CommandPalette';

interface SidebarProps {
  className?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
        if (data) {
          const total = data.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
          setActiveCount(total);
        }
      });
  }, []);

  const navGroups = [
    {
      title: 'WORKSPACE',
      items: [
        { label: 'Dashboard', href: '/', icon: BarChart3 },
        { label: 'Live Inbox', href: '/inbox', icon: MessageSquare, badge: activeCount > 0 ? activeCount : null }
      ]
    },
    {
      title: 'ENGAGE & MARKETING',
      items: [
        { label: 'Contacts CRM', href: '/contacts', icon: Users },
        { label: 'Campaigns', href: '/campaigns', icon: Megaphone },
        { label: 'Automations', href: '/automations', icon: Zap }
      ]
    },
    {
      title: 'CONTENT & ASSETS',
      items: [
        { label: 'Message Templates', href: '/templates', icon: FileText },
        { label: 'Media Library', href: '/media', icon: ImageIcon }
      ]
    },
    {
      title: 'INSIGHTS',
      items: [
        { label: 'Analytics Studio', href: '/analytics', icon: BarChart3 }
      ]
    },
    {
      title: 'INFRASTRUCTURE & APIS',
      items: [
        { label: 'Meta Connection', href: '/whatsapp', icon: Phone },
        { label: 'Developers & Webhooks', href: '/developers', icon: Code2 }
      ]
    }
  ];

  return (
    <>
      <CommandPalette />
      <aside className={`w-64 bg-[#0D131F] text-slate-200 flex flex-col justify-between shrink-0 border-r border-slate-800 select-none z-20 ${className}`}>
        {/* Brand Header */}
        <div>
          <div className="p-4 border-b border-slate-800 bg-[#090D16]">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform duration-200">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base text-white tracking-tight">NexChat</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Classic Pearls Salon</p>
              </div>
            </Link>
          </div>

          {/* Quick Command Launcher */}
          <div className="px-3 pt-3.5">
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                window.dispatchEvent(event);
              }}
              className="w-full py-2 px-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-850 transition-all flex items-center justify-between text-xs font-semibold cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Command className="w-3.5 h-3.5 text-indigo-400" />
                <span>Command Center</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
                ?K
              </kbd>
            </button>
          </div>

          {/* Grouped Navigation */}
          <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-230px)]">
            {navGroups.map((group, idx) => (
              <div key={idx} className="space-y-0.5">
                <p className="px-3 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all duration-150 group ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        }`} />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs animate-pulse">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Live Meta Connection Badge Footer */}
        <div className="p-3 border-t border-slate-800 bg-[#090D16]">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-800/40">
                WA
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">Cloud API</p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Connected
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
        </div>
      </aside>
    </>
  );
}
