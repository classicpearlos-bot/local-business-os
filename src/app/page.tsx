'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { 
  Megaphone, 
  MessageSquare, 
  Users, 
  Zap, 
  CheckCircle2, 
  Eye, 
  ArrowUpRight, 
  Sparkles, 
  Plus, 
  Phone, 
  Send,
  Calendar,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { StatCard, Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function Dashboard() {
  const [stats, setStats] = useState({
    contactsCount: 0,
    messagesCount: 0,
    deliveredCount: 0,
    readCount: 0,
    campaignsCount: 0,
    unreadConversations: 0
  });
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [
          contactsRes,
          messagesRes,
          campaignsRes,
          conversationsRes
        ] = await Promise.all([
          supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('opted_in', true),
          supabase.from('messages').select('status'),
          supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(4),
          supabase.from('conversations').select('id, unread_count, last_message_at, contacts(name, phone_number)').order('last_message_at', { ascending: false }).limit(5)
        ]);

        const messages = messagesRes.data || [];
        const delivered = messages.filter(m => ['DELIVERED', 'READ'].includes(m.status)).length;
        const read = messages.filter(m => m.status === 'READ').length;

        const convs = conversationsRes.data || [];
        const unread = convs.filter(c => (c.unread_count || 0) > 0).length;

        setStats({
          contactsCount: contactsRes.count || 0,
          messagesCount: messages.length,
          deliveredCount: delivered,
          readCount: read,
          campaignsCount: campaignsRes.data?.length || 0,
          unreadConversations: unread
        });

        if (conversationsRes.data) setRecentConversations(conversationsRes.data);
        if (campaignsRes.data) setRecentCampaigns(campaignsRes.data);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const deliveryRate = stats.messagesCount > 0 ? Math.round((stats.deliveredCount / stats.messagesCount) * 100) : 0;
  const readRate = stats.deliveredCount > 0 ? Math.round((stats.readCount / stats.deliveredCount) * 100) : 0;

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Executive Workspace Overview"
          subtitle="Real-time pulse of your WhatsApp Business audience, marketing broadcasts, and team inbox."
          badge={<Badge variant="success" dot pulse>Direct Meta Cloud API v19.0</Badge>}
          actions={
            <div className="flex items-center gap-2.5">
              <Link href="/campaigns">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  New Broadcast
                </Button>
              </Link>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-8 max-w-7xl">
          {/* Welcome Billboard */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative z-10 space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                AI-Native Engagement Engine
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Scale customer conversations with zero middleman fees.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                Send rich media campaigns, automate keyword replies 24/7, and manage team support directly through official Meta APIs.
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
              <Link href="/campaigns">
                <Button variant="whatsapp" className="px-5 py-2.5 text-sm font-bold shadow-lg shadow-[var(--color-cyber-purple)]/40 neon-glow-purple" leftIcon={<Megaphone className="w-4 h-4" />}>
                  Launch Broadcast
                </Button>
              </Link>
              <Link href="/inbox">
                <Button variant="outline" className="bg-[var(--color-cyber-panel)]/10 text-white border-white/20 hover:bg-[var(--color-cyber-panel)]/20" leftIcon={<MessageSquare className="w-4 h-4" />}>
                  Open Inbox
                </Button>
              </Link>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="WhatsApp Audience"
              value={stats.contactsCount}
              subtitle="Opted-in clients ready to receive"
              icon={Users}
              iconColor="text-[var(--color-cyber-purple)]"
              iconBg="bg-[var(--color-cyber-purple)]/10 border-[var(--color-cyber-purple)]/30"
            />
            <StatCard
              title="Delivered Rate"
              value={`${deliveryRate}%`}
              subtitle={`${stats.deliveredCount} handset deliveries`}
              icon={CheckCircle2}
              iconColor="text-[var(--color-cyber-cyan)]"
              iconBg="bg-[var(--color-cyber-cyan)]/10 border-[var(--color-cyber-cyan)]/30"
            />
            <StatCard
              title="Read / Open Rate"
              value={`${readRate}%`}
              subtitle={`${stats.readCount} confirmed read ticks`}
              icon={Eye}
              iconColor="text-[var(--color-cyber-cyan)]"
              iconBg="bg-[var(--color-cyber-cyan)]/10 border-[var(--color-cyber-cyan)]/30"
            />
            <StatCard
              title="Broadcasts Launched"
              value={stats.campaignsCount}
              subtitle="Marketing & offer campaigns"
              icon={Megaphone}
              iconColor="text-[var(--color-cyber-pink)]"
              iconBg="bg-[var(--color-cyber-pink)]/10 border-[var(--color-cyber-pink)]/30"
            />
          </div>

          {/* Dual Column: Recent Broadcasts + Live Inbox Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Campaigns */}
            <Card className="overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Megaphone className="w-4 h-4 text-[var(--color-cyber-purple)]" />
                    <h3 className="text-sm font-bold text-white">Recent Campaigns</h3>
                  </div>
                  <Link href="/campaigns" className="text-xs font-semibold text-[var(--color-cyber-purple)] hover:text-indigo-700 flex items-center gap-1">
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {recentCampaigns.map((camp) => {
                    const percent = Math.min(100, Math.round(((camp.total_sent || 0) / (camp.total_recipients || 1)) * 100));

                    return (
                      <div key={camp.id} className="p-4 flex items-center justify-between hover:bg-[var(--color-cyber-panel)]/5 transition-colors">
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{camp.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{camp.template_name || 'Template'}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant={camp.status === 'COMPLETED' ? 'success' : camp.status === 'FAILED' ? 'danger' : 'primary'} dot>
                            {camp.status}
                          </Badge>
                          <span className="text-xs font-semibold text-gray-400">
                            {camp.total_sent || 0} / {camp.total_recipients || 0}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {recentCampaigns.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-xs font-medium">
                      No broadcast campaigns yet. Click "Launch Broadcast" to begin.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-[var(--color-cyber-bg)] border-t border-white/10 flex justify-end">
                <Link href="/campaigns">
                  <Button variant="outline" size="sm">
                    Campaign Studio
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Live Conversations Stream */}
            <Card className="overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-[var(--color-cyber-purple)]" />
                    <h3 className="text-sm font-bold text-white">Live Customer Conversations</h3>
                  </div>
                  <Link href="/inbox" className="text-xs font-semibold text-[var(--color-cyber-purple)] hover:text-indigo-700 flex items-center gap-1">
                    Shared Inbox <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {recentConversations.map((conv) => (
                    <Link
                      key={conv.id}
                      href="/inbox"
                      className="p-4 flex items-center justify-between hover:bg-[var(--color-cyber-panel)]/5 transition-colors block"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {conv.contacts?.name || 'Customer'}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {conv.contacts?.phone_number || '-'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {conv.unread_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold shadow-xs">
                            {conv.unread_count} new
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-500">
                            {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}

                  {recentConversations.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-xs font-medium">
                      No incoming conversations yet. Messages will appear automatically.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-[var(--color-cyber-bg)] border-t border-white/10 flex justify-end">
                <Link href="/inbox">
                  <Button variant="outline" size="sm">
                    Open Live Inbox
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
