'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Megaphone, 
  MessageSquare, 
  Users, 
  FileText, 
  Sparkles, 
  Image as ImageIcon, 
  BarChart3, 
  Zap, 
  Phone, 
  Code2, 
  Plus, 
  ArrowRight,
  Command
} from 'lucide-react';

interface CommandItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  shortcut?: string;
}

interface CommandGroup {
  group: string;
  items: CommandItem[];
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const actions: CommandGroup[] = [
    {
      group: 'Quick Actions',
      items: [
        { label: 'Create New Campaign', icon: Plus, path: '/campaigns', shortcut: 'C' },
        { label: 'Add New Contact', icon: Users, path: '/contacts', shortcut: 'N' },
        { label: 'Open Live Inbox', icon: MessageSquare, path: '/inbox', shortcut: 'I' },
        { label: 'Sync Meta Templates', icon: FileText, path: '/templates', shortcut: 'T' },
      ]
    },
    {
      group: 'Navigation',
      items: [
        { label: 'Overview Dashboard', icon: BarChart3, path: '/' },
        { label: 'Broadcast Campaigns', icon: Megaphone, path: '/campaigns' },
        { label: 'Media Library', icon: ImageIcon, path: '/media' },
        { label: 'Keyword Automations', icon: Zap, path: '/automations' },
        { label: 'Analytics Studio', icon: BarChart3, path: '/analytics' },
        { label: 'WhatsApp Connection', icon: Phone, path: '/whatsapp' },
        { label: 'Developer API & Webhooks', icon: Code2, path: '/developers' }
      ]
    }
  ];

  const filteredActions = actions.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.label.toLowerCase().includes(query.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, search pages or contacts... (ESC to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 rounded border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* Command List Stream */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {filteredActions.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.group}
              </p>
              {group.items.map((item, iIdx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={iIdx}
                    onClick={() => {
                      setIsOpen(false);
                      router.push(item.path);
                    }}
                    className="p-2.5 px-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-indigo-50/70 text-slate-700 hover:text-indigo-900 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.shortcut && (
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-50 rounded border border-slate-200">
                          {item.shortcut}
                        </kbd>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {filteredActions.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No commands matching "{query}"
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium px-4">
          <span>Navigate with arrow keys</span>
          <span>Press <strong>Enter</strong> to select</span>
        </div>
      </div>
    </div>
  );
}
