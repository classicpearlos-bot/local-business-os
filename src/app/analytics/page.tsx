'use client';

import React, { useState, useEffect } from 'react';
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
  Users,
  DollarSign,
  Crown,
  Clock,
  HeartCrack,
  Cake,
  ShieldCheck
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CampaignROIMetrics } from '@/lib/analytics/attribution';
import { RFMSegmentSummary } from '@/lib/rfm/segmentation';

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalMessages: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    campaignsCount: 0,
    totalContacts: 0
  });
  const [roiMetrics, setRoiMetrics] = useState<CampaignROIMetrics[]>([]);
  const [rfmSummary, setRfmSummary] = useState<RFMSegmentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [msgRes, contactsRes, roiRes, rfmRes] = await Promise.all([
        supabase.from('messages').select('status'),
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        fetch('/api/analytics/campaign-roi').then(r => r.ok ? r.json() : { roi_metrics: [] }),
        fetch('/api/rfm').then(r => r.ok ? r.json() : { summary: null })
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
        campaignsCount: roiRes.roi_metrics?.length || 0,
        totalContacts: contactsRes.count || 0
      });

      setRoiMetrics(roiRes.roi_metrics || []);
      setRfmSummary(rfmRes.summary || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const deliveryRate = stats.totalMessages > 0 ? Math.round((stats.delivered / stats.totalMessages) * 100) : 0;
  const readRate = stats.delivered > 0 ? Math.round((stats.read / stats.delivered) * 100) : 0;
  const totalAttributedRevenue = roiMetrics.reduce((acc, curr) => acc + (curr.attributed_revenue || 0), 0);

  return (
    <div className="flex h-screen bg-[#F7F3EA] text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Executive Analytics & ROI Studio"
          subtitle="Real-time WhatsApp delivery, open rates, RFM lifecycle distribution, and campaign revenue attribution."
          badge={<Badge variant="primary">Zero-Quota Supabase Arch</Badge>}
          actions={
            <Button variant="outline" size="sm" onClick={fetchAnalytics} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>
              Refresh Analytics
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-8 max-w-7xl">
          
          {/* Executive Performance Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Dispatched"
              value={stats.totalMessages}
              subtitle="All outbound templates & chats"
              icon={Send}
              iconColor="text-indigo-400"
              iconBg="bg-indigo-950 border-indigo-800"
            />
            <StatCard
              title="Delivered / Reach Rate"
              value={`${deliveryRate}%`}
              subtitle={`${stats.delivered} client devices reached`}
              icon={CheckCircle2}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-950 border-emerald-800"
            />
            <StatCard
              title="Read / Open Rate"
              value={`${readRate}%`}
              subtitle={`${stats.read} customers read in WhatsApp`}
              icon={Eye}
              iconColor="text-sky-400"
              iconBg="bg-sky-950 border-sky-800"
            />
            <StatCard
              title="Attributed Revenue"
              value={`₹${totalAttributedRevenue.toLocaleString()}`}
              subtitle="From broadcast bookings"
              icon={DollarSign}
              iconColor="text-amber-400"
              iconBg="bg-amber-950 border-amber-800"
            />
          </div>

          {/* Salon RFM Customer Lifecycle Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Salon RFM Lifecycle Health</h3>
                <p className="text-xs text-[#7C756D]">Automated recency & spending segmentation for Classic Pearls Salon</p>
              </div>
              <Badge variant="success">Auto Synced</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-amber-500/40">
                <div className="flex items-center justify-between text-xs font-black text-amber-400 mb-1">
                  <span>VIP Clients</span>
                  <Crown className="w-3.5 h-3.5" />
                </div>
                <div className="text-2xl font-black text-white">{rfmSummary?.vip_count || 0}</div>
                <p className="text-[10px] text-[#7C756D] mt-0.5">Spend &gt; ₹5,000 / Frequent</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-emerald-500/40">
                <div className="flex items-center justify-between text-xs font-black text-emerald-400 mb-1">
                  <span>Active Clients</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-2xl font-black text-white">{rfmSummary?.active_count || 0}</div>
                <p className="text-[10px] text-[#7C756D] mt-0.5">Visited in last 44 days</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-orange-500/40">
                <div className="flex items-center justify-between text-xs font-black text-orange-400 mb-1">
                  <span>Slipping Away</span>
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="text-2xl font-black text-white">{rfmSummary?.slipping_away_count || 0}</div>
                <p className="text-[10px] text-[#7C756D] mt-0.5">45–89 days inactive</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-rose-500/40">
                <div className="flex items-center justify-between text-xs font-black text-rose-400 mb-1">
                  <span>Lost Clients</span>
                  <HeartCrack className="w-3.5 h-3.5" />
                </div>
                <div className="text-2xl font-black text-white">{rfmSummary?.lost_count || 0}</div>
                <p className="text-[10px] text-[#7C756D] mt-0.5">90+ days inactive (Winback)</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-pink-500/40">
                <div className="flex items-center justify-between text-xs font-black text-pink-400 mb-1">
                  <span>Birthday Club</span>
                  <Cake className="w-3.5 h-3.5" />
                </div>
                <div className="text-2xl font-black text-white">{rfmSummary?.birthday_upcoming_count || 0}</div>
                <p className="text-[10px] text-[#7C756D] mt-0.5">Upcoming in next 7 days</p>
              </div>
            </div>
          </div>

          {/* Campaign ROI Attribution Table */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-[#EFE3CF] bg-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-white">Campaign Conversion & Revenue ROI Attribution</h4>
                <p className="text-xs text-[#7C756D] font-medium">Tracking replies, bookings, and direct revenue generated per broadcast.</p>
              </div>
              <Badge variant="primary">Executive Level</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#FAF7F2] border-b border-[#EFE3CF] text-[#7C756D] font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Campaign Name</th>
                    <th className="px-6 py-4">Template</th>
                    <th className="px-6 py-4">Recipients</th>
                    <th className="px-6 py-4">Delivery Rate</th>
                    <th className="px-6 py-4">Read Rate</th>
                    <th className="px-6 py-4">Replies</th>
                    <th className="px-6 py-4">Bookings</th>
                    <th className="px-6 py-4">Attributed Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {roiMetrics.map((camp) => (
                    <tr key={camp.campaign_id} className="hover:bg-[#FAF7F2] transition-colors">
                      <td className="px-6 py-4 font-black text-white">
                        {camp.campaign_name}
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-[#7C756D]">
                        {camp.template_name}
                      </td>
                      <td className="px-6 py-4 text-[#2C2723]">
                        {camp.total_recipients}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-400">
                        {camp.delivery_rate_pct}%
                      </td>
                      <td className="px-6 py-4 font-bold text-sky-400">
                        {camp.read_rate_pct}%
                      </td>
                      <td className="px-6 py-4 text-indigo-300 font-bold">
                        {camp.replies_count}
                      </td>
                      <td className="px-6 py-4 text-emerald-300 font-bold">
                        {camp.bookings_count}
                      </td>
                      <td className="px-6 py-4 font-black text-amber-400">
                        ₹{camp.attributed_revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </main>
      </div>
    </div>
  );
}
