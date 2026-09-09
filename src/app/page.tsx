'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { 
  Users, 
  ChevronRight, 
  Sparkles,
  Phone,
  RefreshCw,
  Plus,
  ArrowRight,
  Layers
} from "lucide-react";

interface DashboardData {
  stats: {
    totalContacts: number;
    totalConversations: number;
    totalCampaigns: number;
    activeCampaigns: number;
    unreadMessages: number;
    campaigns: {
      sent: number;
      delivered: number;
      read: number;
      failed: number;
      successRate: number;
    };
    weeklyActivity: { day: string; count: number; dateStr: string }[];
    totalWeeklyMessages: number;
  };
  recentConversations: {
    id: string;
    name: string;
    phone: string;
    initials: string;
    lastMessage: string;
    time: string;
    unread: number;
  }[];
  recentCampaigns: {
    id: string;
    name: string;
    status: string;
    total_sent: number;
    total_delivered: number;
    total_read: number;
    created_at: string;
  }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayFormatted, setTodayFormatted] = useState('');

  useEffect(() => {
    setTodayFormatted(
      new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    );
  }, []);

  const fetchLiveStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (e) {
      console.error('Failed to load live dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveStats();
  }, [fetchLiveStats]);

  const stats = data?.stats || {
    totalContacts: 0,
    totalConversations: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    unreadMessages: 0,
    campaigns: { sent: 0, delivered: 0, read: 0, failed: 0, successRate: 0 },
    weeklyActivity: [],
    totalWeeklyMessages: 0
  };

  const recentConversations = data?.recentConversations || [];
  const recentCampaigns = data?.recentCampaigns || [];

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-[#111111] font-sans antialiased overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopBar />

        <main className="p-8 md:p-12 space-y-12 max-w-[1600px] w-full mx-auto">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[#E5E7EB] pb-6">
            <div>
              <p className="text-xs font-light tracking-[0.2em] text-[#71717A] uppercase mb-2">
                {todayFormatted || 'Loading Date...'}
              </p>
              <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#111111] tracking-wide">
                Welcome back, Jessica
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => fetchLiveStats()}
                disabled={loading}
                className="h-10 px-5 rounded-md bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] text-[13px] font-medium flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-[#71717A] ${loading ? 'animate-spin' : ''}`} />
                <span>Sync Data</span>
              </button>
              <Link href="/campaigns">
                <button className="h-10 px-6 rounded-md bg-[#111111] text-white text-[13px] font-medium flex items-center gap-2 transition-colors hover:bg-[#D4AF37]">
                  <Plus className="w-4 h-4" />
                  <span>New Broadcast</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Primary Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stat: Audience */}
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-lg relative overflow-hidden group hover:border-[#D1D5DB] transition-colors">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[11px] font-medium tracking-widest text-[#71717A] uppercase">Total Contacts</p>
                <Users className="w-4 h-4 text-[#A1A1AA]" />
              </div>
              <h3 className="text-4xl font-serif font-medium text-[#111111]">{stats.totalContacts.toLocaleString()}</h3>
            </div>

            {/* Stat: Engagement */}
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-lg relative overflow-hidden group hover:border-[#D1D5DB] transition-colors">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[11px] font-medium tracking-widest text-[#71717A] uppercase">Active Threads</p>
                <Layers className="w-4 h-4 text-[#A1A1AA]" />
              </div>
              <h3 className="text-4xl font-serif font-medium text-[#111111]">{stats.totalConversations.toLocaleString()}</h3>
            </div>

            {/* Stat: Delivery */}
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-lg relative overflow-hidden group hover:border-[#D1D5DB] transition-colors">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[11px] font-medium tracking-widest text-[#71717A] uppercase">Messages Sent</p>
                <ArrowRight className="w-4 h-4 text-[#A1A1AA]" />
              </div>
              <h3 className="text-4xl font-serif font-medium text-[#111111]">{stats.campaigns.sent.toLocaleString()}</h3>
            </div>

            {/* Stat: Open Rate */}
            <div className="p-6 bg-[#111111] border border-[#111111] rounded-lg relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[11px] font-medium tracking-widest text-[#A1A1AA] uppercase">Read Rate</p>
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <h3 className="text-4xl font-serif font-medium text-white">{stats.campaigns.successRate}%</h3>
            </div>
          </div>

          {/* Secondary Grid (Recent Activity & Campaigns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Inbox */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-serif font-medium text-[#111111]">Recent Inquiries</h2>
                <Link href="/inbox" className="text-[13px] text-[#71717A] hover:text-[#111111] flex items-center gap-1 transition-colors">
                  View Inbox <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              
              <div className="bg-white border border-[#E5E7EB] rounded-lg divide-y divide-[#E5E7EB]">
                {recentConversations.length > 0 ? (
                  recentConversations.map((conv) => (
                    <div key={conv.id} className="p-4 flex items-center gap-4 hover:bg-[#FAFAFA] transition-colors">
                      <div className="w-10 h-10 rounded-full bg-[#FAFAFA] border border-[#E5E7EB] flex items-center justify-center text-[#111111] font-serif font-medium">
                        {conv.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[13px] font-medium text-[#111111] truncate">{conv.name}</p>
                          <span className="text-[11px] text-[#A1A1AA]">{conv.time}</span>
                        </div>
                        <p className="text-[13px] text-[#71717A] truncate font-light">{conv.lastMessage}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-[#A1A1AA] font-light text-[13px]">
                    Your inbox is currently clear.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Broadcasts */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-serif font-medium text-[#111111]">Recent Broadcasts</h2>
                <Link href="/campaigns" className="text-[13px] text-[#71717A] hover:text-[#111111] flex items-center gap-1 transition-colors">
                  View All <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-lg divide-y divide-[#E5E7EB]">
                {recentCampaigns.length > 0 ? (
                  recentCampaigns.map((camp) => (
                    <div key={camp.id} className="p-4 hover:bg-[#FAFAFA] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-medium text-[#111111] truncate pr-4">{camp.name}</p>
                        <span className="text-[10px] font-medium px-2 py-1 bg-[#FAFAFA] border border-[#E5E7EB] text-[#71717A] uppercase tracking-wider rounded-sm">
                          {camp.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#71717A] uppercase tracking-wider font-medium">
                        <span>Dispatched: {camp.total_sent}</span>
                        <span className="text-[#10B981]">Delivered: {camp.total_delivered}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-[#A1A1AA] font-light text-[13px]">
                    No broadcasts have been dispatched yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Infrastructure Banner */}
          <div className="p-8 bg-white border border-[#E5E7EB] rounded-lg flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-full border border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-[#111111] stroke-[1.5]" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-medium text-[#111111]">WhatsApp Business API</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <p className="text-[11px] font-medium tracking-widest text-[#71717A] uppercase">
                    System Operational
                  </p>
                </div>
              </div>
            </div>

            <Link href="/whatsapp">
              <button className="h-10 px-6 rounded-md border border-[#E5E7EB] hover:border-[#111111] hover:bg-[#111111] hover:text-white transition-all text-[13px] font-medium text-[#111111]">
                Manage Settings
              </button>
            </Link>
          </div>

        </main>
      </div>
    </div>
  );
}
