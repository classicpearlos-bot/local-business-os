'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Eye, 
  MessageSquare, 
  AlertTriangle, 
  Calendar,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Send,
  Users
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalMessages: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    campaignsCount: 0,
    totalContacts: 0
  });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [msgRes, campRes, contactsRes] = await Promise.all([
        supabase.from('messages').select('status'),
        supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('contacts').select('id', { count: 'exact', head: true })
      ]);

      const messages = msgRes.data || [];
      const totalMsg = messages.length;
      const delivered = messages.filter(m => ['DELIVERED', 'READ'].includes(m.status)).length;
      const read = messages.filter(m => m.status === 'READ').length;
      const failed = messages.filter(m => m.status === 'FAILED').length;

      setStats({
        totalMessages: totalMsg,
        delivered,
        read,
        failed,
        campaignsCount: campRes.data?.length || 0,
        totalContacts: contactsRes.count || 0
      });

      if (campRes.data) setCampaigns(campRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const deliveryRate = stats.totalMessages > 0 ? Math.round((stats.delivered / stats.totalMessages) * 100) : 0;
  const readRate = stats.delivered > 0 ? Math.round((stats.read / stats.delivered) * 100) : 0;

  return (
    <div className="flex h-screen bg-[#070A12]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Analytics Studio"
          subtitle="Real-time WhatsApp delivery, open rates, read ticks, and campaign performance."
          badge={<Badge variant="primary">Live Realtime Data</Badge>}
          actions={
            <Button variant="outline" size="sm" onClick={fetchAnalytics} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>
              Refresh Data
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-8 max-w-7xl">
          {/* Executive Performance Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Dispatched"
              value={stats.totalMessages}
              subtitle="All outbound messages & broadcasts"
              icon={Send}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-50 border-indigo-100"
            />
            <StatCard
              title="Delivered / Reach Rate"
              value={`${deliveryRate}%`}
              subtitle={`${stats.delivered} devices reached`}
              icon={CheckCircle2}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50 border-emerald-100"
            />
            <StatCard
              title="Read / Open Rate"
              value={`${readRate}%`}
              subtitle={`${stats.read} customers opened`}
              icon={Eye}
              iconColor="text-sky-600"
              iconBg="bg-sky-50 border-sky-100"
            />
            <StatCard
              title="Audience Pool"
              value={stats.totalContacts}
              subtitle="Opted-in WhatsApp clients"
              icon={Users}
              iconColor="text-purple-600"
              iconBg="bg-purple-50 border-purple-100"
            />
          </div>

          {/* AI Insights & Funnel Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0D131F] border border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Message Lifecycle Funnel</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">End-to-end customer journey from queue to read tick</p>
                </div>
                <Badge variant="success" dot>Realtime Meta Webhook Feed</Badge>
              </div>

              {/* Visual Funnel */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">1. Dispatched from Server</span>
                    <span className="text-indigo-600 font-bold">{stats.totalMessages} (100%)</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full w-full" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">2. Reached Client Handset (Delivered)</span>
                    <span className="text-emerald-600 font-bold">{stats.delivered} ({deliveryRate}%)</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${deliveryRate}%` }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">3. Opened & Read in WhatsApp (Read Tick)</span>
                    <span className="text-sky-600 font-bold">{stats.read} ({readRate}%)</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${(stats.read / (stats.totalMessages || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights Card */}
            <div className="p-6 rounded-2xl bg-[#0B0F17] text-white border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  AI Engagement Insights
                </div>
                <h4 className="text-base font-bold text-white leading-snug">
                  Image Broadcasts convert 3.2x faster than plain text.
                </h4>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Campaigns with personalized variables (e.g. customer name) achieve an average open rate of 88% within the first 15 minutes of dispatch.
                </p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                <strong>Next Recommendation:</strong> Schedule your next flash sale campaign between 11:00 AM – 1:00 PM for maximum click-through rates.
              </div>
            </div>
          </div>

          {/* Recent Campaign Performance Table */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-[#0D131F] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Campaign Comparison</h4>
                <p className="text-xs text-slate-500 font-medium">Historical conversion and delivery metrics per broadcast.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0B0F19] border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Campaign Name</th>
                    <th className="px-6 py-4">Template</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Recipients</th>
                    <th className="px-6 py-4">Delivery Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-700">
                  {campaigns.map((camp) => {
                    const rate = Math.min(100, Math.round(((camp.total_sent || 0) / (camp.total_recipients || 1)) * 100));

                    return (
                      <tr key={camp.id} className="hover:bg-[#0B0F19]/80">
                        <td className="px-6 py-4 font-bold text-white text-xs">
                          {camp.name}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">
                          {camp.template_name}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={camp.status === 'COMPLETED' ? 'success' : camp.status === 'FAILED' ? 'danger' : 'primary'} dot>
                            {camp.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                          {camp.total_recipients || 0}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-emerald-600">
                          {rate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
