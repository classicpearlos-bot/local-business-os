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
  Sparkles,
  Command,
  Image as ImageIcon,
  CheckCircle2,
  ChevronRight
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
  const [metaConnected, setMetaConnected] = useState<boolean>(true);

  useEffect(() => {
    // Check unread conversations count
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
        { label: 'Live Inbox', href: '/inbox', icon: MessageSquare, badge: activeCount > 0 ? activeCount : 'Active' }
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
      <aside className={`w-64 bg-[var(--color-cyber-panel)] text-slate-300 flex flex-col justify-between shrink-0 border-r border-white/10/80 select-none z-20 ${className}`}>
        {/* Brand Header */}
        <div>
          <div className="p-5 flex items-center justify-between border-b border-white/10/80">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base text-white tracking-tight">NexChat</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 tracking-wider">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">WhatsApp Cloud API</p>
              </div>
            </Link>
          </div>

          {/* Quick Command Launcher */}
          <div className="px-4 pt-4">
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                window.dispatchEvent(event);
              }}
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 hover:border-[var(--color-cyber-purple)] transition-all flex items-center justify-between text-xs font-medium cursor-pointer group shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Command className="w-3.5 h-3.5 text-indigo-400" />
                <span>Command Center</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700 group-hover:border-slate-600">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Grouped Navigation */}
          <nav className="p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-230px)]">
            {navGroups.map((group, idx) => (
              <div key={idx} className="space-y-1">
                <p className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group ${
                        isActive
                          ? 'bg-[var(--color-cyber-purple)] text-white font-semibold neon-glow-purple'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                        }`} />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[var(--color-cyber-cyan)]/20 text-[var(--color-cyber-cyan)] border border-[var(--color-cyber-cyan)]/30'
                        }`}>
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

        {/* Account Switcher Footer */}
        <div className="p-4 border-t border-white/10/80 bg-black/20">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900/60 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-700">
                NX
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">NexChat Workspace</p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Meta Connected
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </div>
        </div>
      </aside>
    </>
  );
}
