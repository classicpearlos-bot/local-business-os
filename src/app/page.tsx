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
  TrendingUp,
  Activity
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
    <div className="flex h-screen bg-[#070A12] text-slate-100 font-sans antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Executive Command Center"
          subtitle="Real-time pulse of Classic Pearls Salon WhatsApp Business audience, marketing broadcasts, and team inbox."
          badge={<Badge variant="success" dot pulse>Meta Cloud API v19.0 Live</Badge>}
          actions={
            <div className="flex items-center gap-2.5">
              <Link href="/campaigns">
                <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                  New Broadcast
                </Button>
              </Link>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 space-y-8 max-w-7xl">
          {/* Ultra-Luxury Welcome Billboard */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#131C31] to-[#0A0E1A] border border-slate-800/80 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute -right-10 -top-10 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-72 h-72 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-800/40">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Salon Business OS � Enterprise Edition
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                Luxury WhatsApp Customer Experience
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                Broadcast targeted salon offers, respond instantly with AI receptionist, and delight every client on WhatsApp with zero middleman fees.
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
              <Link href="/campaigns">
                <Button variant="whatsapp" className="px-5 py-2.5 text-sm font-bold" leftIcon={<Megaphone className="w-4 h-4" />}>
                  Launch Broadcast
                </Button>
              </Link>
              <Link href="/inbox">
                <Button variant="outline" className="px-5 py-2.5 text-sm font-bold" leftIcon={<MessageSquare className="w-4 h-4" />}>
                  Open Inbox
                </Button>
              </Link>
            </div>
          </div>

          {/* KPI Stat Cards with Luxury Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Verified Audience"
              value={stats.contactsCount}
              subtitle="Opted-in salon clients"
              icon={Users}
              iconColor="text-indigo-400"
              iconBg="bg-indigo-950/80 border-indigo-800/50"
              trend="+100% Opted In"
              trendPositive={true}
            />
            <StatCard
              title="Delivery Rate"
              value={`${deliveryRate}%`}
              subtitle={`${stats.deliveredCount} confirmed deliveries`}
              icon={CheckCircle2}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-950/80 border-emerald-800/50"
              trend="Handset Delivered"
              trendPositive={true}
            />
            <StatCard
              title="Read / Open Rate"
              value={`${readRate}%`}
              subtitle={`${stats.readCount} verified read receipts`}
              icon={Eye}
              iconColor="text-sky-400"
              iconBg="bg-sky-950/80 border-sky-800/50"
              trend="High Engagement"
              trendPositive={true}
            />
            <StatCard
              title="Broadcast Campaigns"
              value={stats.campaignsCount}
              subtitle="Active & completed campaigns"
              icon={Megaphone}
              iconColor="text-amber-400"
              iconBg="bg-amber-950/80 border-amber-800/50"
              trend="Live Marketing"
              trendPositive={true}
            />
          </div>

          {/* Dual Column: Recent Broadcasts + Live Inbox Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Campaigns */}
            <Card className="overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0B0F19]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-extrabold text-white">Recent Marketing Broadcasts</h3>
                  </div>
                  <Link href="/campaigns" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {recentCampaigns.map((camp) => {
                    return (
                      <div key={camp.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{camp.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Template: {camp.template_name || 'Template'}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant={camp.status === 'COMPLETED' ? 'success' : camp.status === 'FAILED' ? 'danger' : 'primary'} dot>
                            {camp.status}
                          </Badge>
                          <span className="text-xs font-bold text-slate-300">
                            {camp.total_sent || 0} / {camp.total_recipients || 0}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {recentCampaigns.length === 0 && (
                    <div className="p-8 text-center text-slate-500 text-xs font-medium">
                      No broadcast campaigns yet. Click "Launch Broadcast" to begin.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-[#090D16] border-t border-slate-800 flex justify-end">
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
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0B0F19]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-extrabold text-white">Live Customer Inbox</h3>
                  </div>
                  <Link href="/inbox" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                    Shared Inbox <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {recentConversations.map((conv) => (
                    <Link
                      key={conv.id}
                      href="/inbox"
                      className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors block"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {conv.contacts?.name || 'Customer'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {conv.contacts?.phone_number || '-'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {conv.unread_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold shadow-sm animate-pulse">
                            {conv.unread_count} new
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">
                            {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}

                  {recentConversations.length === 0 && (
                    <div className="p-8 text-center text-slate-500 text-xs font-medium">
                      No incoming conversations yet. Messages will appear automatically.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-[#090D16] border-t border-slate-800 flex justify-end">
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
