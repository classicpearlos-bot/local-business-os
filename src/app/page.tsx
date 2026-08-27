'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { 
  MessageSquare, 
  Mail, 
  Send, 
  Users, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  Crown, 
  ChevronRight, 
  TrendingUp, 
  Sparkles,
  Phone,
  CheckCircle2,
  RefreshCw,
  Plus,
  ArrowRight,
  Radio,
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

  // Dynamic Current Date Formatting (e.g., "Thursday, 27 Aug 2026")
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

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
    weeklyActivity: [
      { day: 'Mon', count: 0, dateStr: '' },
      { day: 'Tue', count: 0, dateStr: '' },
      { day: 'Wed', count: 0, dateStr: '' },
      { day: 'Thu', count: 0, dateStr: '' },
      { day: 'Fri', count: 0, dateStr: '' },
      { day: 'Sat', count: 0, dateStr: '' },
      { day: 'Sun', count: 0, dateStr: '' }
    ],
    totalWeeklyMessages: 0
  };

  const recentConversations = data?.recentConversations || [];
  const recentCampaigns = data?.recentCampaigns || [];

  // Calculate SVG curve coordinates from real weekly activity
  const counts = stats.weeklyActivity.map(w => w.count);
  const maxCount = Math.max(...counts, 10);
  const points = counts.map((cnt, i) => {
    const x = (i / (counts.length - 1)) * 280 + 10;
    const y = 95 - (cnt / maxCount) * 75;
    return { x, y, count: cnt };
  });

  const svgPathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} Q ${prev.x} ${prev.y}, ${cx} ${(prev.y + pt.y) / 2} T ${pt.x} ${pt.y}`;
  }, '');

  const areaPathD = `${svgPathD} L 290 110 L 10 110 Z`;

  // Avatar color generator based on initials
  const getAvatarGradient = (initials: string) => {
    const charCode = initials.charCodeAt(0) || 0;
    if (charCode % 4 === 0) return 'from-amber-200 to-amber-400 text-amber-950';
    if (charCode % 4 === 1) return 'from-emerald-200 to-emerald-400 text-emerald-950';
    if (charCode % 4 === 2) return 'from-purple-200 to-purple-400 text-purple-950';
    return 'from-rose-200 to-rose-400 text-rose-950';
  };

  return (
    <div className="flex h-screen bg-[#F7F3EA] text-[#1E1B18] font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopBar />

        <main className="p-6 sm:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* Greeting Header & Real Date Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B18] tracking-tight flex items-center gap-2">
                <span>Good Morning, Jessica</span>
                <span className="text-2xl animate-pulse">👋</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#7C756D] font-medium mt-1">
                Here&apos;s what&apos;s happening with Classic Pearl today.
              </p>
            </div>

            {/* Date Picker & Real Refresh Button */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchLiveStats()}
                disabled={loading}
                className="h-10 px-3.5 rounded-full bg-white border border-[#EFE3CF] hover:border-[#DFBE7E] shadow-xs text-xs font-bold text-[#3E2D12] flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                title="Refresh real-time data"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#C59E3F] ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sync Data</span>
              </button>

              <div className="h-10 px-4 rounded-full bg-white border border-[#EFE3CF] shadow-xs text-xs font-bold text-[#3E2D12] flex items-center gap-2.5">
                <CalendarIcon className="w-4 h-4 text-[#C59E3F]" />
                <span>{todayFormatted}</span>
              </div>
            </div>
          </div>

          {/* Top 4 Real KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Total Conversations */}
            <div className="card-luxury p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C756D]">
                <span>Total Conversations</span>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live
                </span>
              </div>
              <div className="flex items-center justify-between my-3">
                <h3 className="text-3xl font-black text-[#1E1B18] tracking-tight">
                  {stats.totalConversations.toLocaleString()}
                </h3>
                <div className="w-12 h-12 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center justify-center shrink-0 shadow-xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#059669]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Active WhatsApp Threads</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#FDE68A] to-transparent" />
            </div>

            {/* 2. Unread Messages */}
            <div className="card-luxury p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C756D]">
                <span>Unread Messages</span>
                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Real-Time
                </span>
              </div>
              <div className="flex items-center justify-between my-3">
                <h3 className="text-3xl font-black text-[#1E1B18] tracking-tight">
                  {stats.unreadMessages.toLocaleString()}
                </h3>
                <div className="w-12 h-12 rounded-full bg-[#FEF9C3] border border-[#FEF08A] text-[#CA8A04] flex items-center justify-center shrink-0 shadow-xs">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#CA8A04]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Requires Guest Response</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#FEF08A] to-transparent" />
            </div>

            {/* 3. Total Campaigns */}
            <div className="card-luxury p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C756D]">
                <span>Broadcast Campaigns</span>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {stats.totalCampaigns} Total
                </span>
              </div>
              <div className="flex items-center justify-between my-3">
                <h3 className="text-3xl font-black text-[#1E1B18] tracking-tight">
                  {stats.activeCampaigns}
                </h3>
                <div className="w-12 h-12 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center shrink-0 shadow-xs">
                  <Send className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#059669]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Marketing & Retention</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#BBF7D0] to-transparent" />
            </div>

            {/* 4. Total Contacts */}
            <div className="card-luxury p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C756D]">
                <span>Salon Guests (CRM)</span>
                <span className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Database
                </span>
              </div>
              <div className="flex items-center justify-between my-3">
                <h3 className="text-3xl font-black text-[#1E1B18] tracking-tight">
                  {stats.totalContacts.toLocaleString()}
                </h3>
                <div className="w-12 h-12 rounded-full bg-[#F3E8FF] border border-[#E9D5FF] text-[#9333EA] flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#9333EA]">
                <Users className="w-3.5 h-3.5" />
                <span>Opted-In WhatsApp Contacts</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#E9D5FF] to-transparent" />
            </div>
          </div>

          {/* Middle Row Grid (4 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Real Recent Conversations (3.5 cols) */}
            <div className="lg:col-span-3 card-luxury p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE3CF]">
                  <h2 className="text-sm font-bold text-[#1E1B18]">Recent Conversations</h2>
                  <Link href="/inbox" className="text-xs font-bold text-[#B88B2A] hover:underline cursor-pointer">
                    View All
                  </Link>
                </div>

                <div className="divide-y divide-[#EFE3CF]/60 mt-2">
                  {recentConversations.length > 0 ? (
                    recentConversations.map((conv) => (
                      <Link
                        key={conv.id}
                        href={`/inbox?id=${conv.id}`}
                        className="py-3 flex items-center justify-between group hover:bg-[#FAF7F2] -mx-2 px-2 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(conv.initials)} font-bold text-xs flex items-center justify-center shrink-0 shadow-xs border border-white`}>
                            {conv.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#1E1B18] truncate group-hover:text-[#B88B2A] transition-colors">
                              {conv.name}
                            </p>
                            <p className="text-[11px] text-[#7C756D] truncate mt-0.5 max-w-[140px]">
                              {conv.lastMessage}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <p className="text-[10px] text-[#9E968D] font-medium">{conv.time}</p>
                          {conv.unread > 0 ? (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#DFB755] text-[#3E2D12] text-[9px] font-bold mt-1 shadow-xs">
                              {conv.unread}
                            </span>
                          ) : (
                            <span className="inline-block w-2 h-2 rounded-full border border-[#DFBE7E] mt-2" />
                          )}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-[#7C756D]">
                      No active conversations yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Real Analytics Overview (4.5 cols) */}
            <div className="lg:col-span-4 card-luxury p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE3CF]">
                  <h2 className="text-sm font-bold text-[#1E1B18]">Analytics Overview</h2>
                  <span className="text-[11px] font-bold text-[#8C6514] bg-[#FDF6E2] px-2.5 py-1 rounded-full border border-[#EBD4A4]">
                    Last 7 Days
                  </span>
                </div>

                {/* Real Dynamic Golden Line Area Graph */}
                <div className="py-4 relative">
                  <div className="h-40 w-full relative flex items-end justify-between px-2 pt-6">
                    {/* Dynamic SVG Curve Line from Real Data */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 120">
                      <defs>
                        <linearGradient id="goldGradientReal" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#DFB755" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#DFB755" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Area Fill */}
                      <path
                        d={areaPathD}
                        fill="url(#goldGradientReal)"
                      />
                      {/* Stroke Line */}
                      <path
                        d={svgPathD}
                        fill="none"
                        stroke="#C59E3F"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      {/* Interactive Data Points */}
                      {points.map((pt, idx) => (
                        <circle key={idx} cx={pt.x} cy={pt.y} r="4" fill="#FFFFFF" stroke="#C59E3F" strokeWidth="2.5" />
                      ))}
                    </svg>

                    {/* Peak Point Dynamic Tooltip */}
                    <div className="absolute right-6 top-2 px-2.5 py-0.5 rounded-md bg-white border border-[#DFBE7E] shadow-sm text-[10px] font-extrabold text-[#7A5714]">
                      {stats.totalWeeklyMessages} Messages
                    </div>

                    {/* Dynamic X-Axis Labels */}
                    <div className="w-full flex justify-between text-[10px] font-bold text-[#9E968D] pt-2 border-t border-[#EFE3CF]/60 z-10">
                      {stats.weeklyActivity.map((w, idx) => (
                        <span key={idx}>{w.day}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom 3 Summary Metrics with Real DB Values */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#EFE3CF] text-center">
                <div className="p-2 rounded-xl bg-[#FAF7F2]">
                  <p className="text-[10px] text-[#7C756D] font-bold">Total Contacts</p>
                  <p className="text-sm font-black text-[#1E1B18] mt-0.5">{stats.totalContacts}</p>
                  <span className="text-[9px] font-bold text-[#059669]">Opted-In</span>
                </div>
                <div className="p-2 rounded-xl bg-[#FAF7F2]">
                  <p className="text-[10px] text-[#7C756D] font-bold">Weekly Activity</p>
                  <p className="text-sm font-black text-[#1E1B18] mt-0.5">{stats.totalWeeklyMessages}</p>
                  <span className="text-[9px] font-bold text-[#059669]">Dispatched</span>
                </div>
                <div className="p-2 rounded-xl bg-[#FAF7F2]">
                  <p className="text-[10px] text-[#7C756D] font-bold">Success Rate</p>
                  <p className="text-sm font-black text-[#1E1B18] mt-0.5">{stats.campaigns.successRate}%</p>
                  <span className="text-[9px] font-bold text-[#059669]">Delivered</span>
                </div>
              </div>
            </div>

            {/* Column 3: Real Campaign Performance (2.5 cols) */}
            <div className="lg:col-span-3 card-luxury p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE3CF]">
                  <h2 className="text-sm font-bold text-[#1E1B18]">Campaign Performance</h2>
                  <span className="text-[10px] font-bold text-[#5D564E] bg-[#FAF7F2] px-2 py-0.5 rounded-lg border border-[#EFE3CF]">
                    {stats.totalCampaigns} Campaigns
                  </span>
                </div>

                {/* Real Donut Chart Gauge */}
                <div className="flex flex-col items-center justify-center my-4">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      {/* Background Ring */}
                      <path
                        className="text-[#F2ECE0]"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* Golden Progress Ring */}
                      <path
                        className="text-[#C59E3F]"
                        strokeDasharray={`${stats.campaigns.successRate}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center text-center">
                      <span className="text-2xl font-black text-[#1E1B18]">{stats.campaigns.successRate}%</span>
                      <span className="text-[9px] font-bold text-[#7C756D] uppercase">Delivery Rate</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Metric Rows with Real Database Data */}
              <div className="space-y-2 pt-3 border-t border-[#EFE3CF] text-xs font-bold">
                <div className="flex items-center justify-between text-[#5D564E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span>Sent</span>
                  </div>
                  <span className="text-[#1E1B18] font-black">{stats.campaigns.sent.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[#5D564E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span>Delivered</span>
                  </div>
                  <span className="text-[#1E1B18] font-black">{stats.campaigns.delivered.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[#5D564E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" />
                    <span>Read</span>
                  </div>
                  <span className="text-[#1E1B18] font-black">{stats.campaigns.read.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[#5D564E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <span>Failed</span>
                  </div>
                  <span className="text-[#1E1B18] font-black">{stats.campaigns.failed.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Column 4: Real Recent Broadcast Campaigns & Quick Launcher (2 cols) */}
            <div className="lg:col-span-2 card-luxury p-4 flex flex-col justify-between text-xs">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif font-black text-xs text-[#8C6514] uppercase tracking-wider">
                    Recent Broadcasts
                  </h3>
                  <Link href="/campaigns" className="text-[10px] font-bold text-[#B88B2A] hover:underline">
                    View
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {recentCampaigns.length > 0 ? (
                    recentCampaigns.map((camp) => (
                      <div key={camp.id} className="p-2 rounded-xl bg-[#FAF7F2] border border-[#EFE3CF]">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-[#1E1B18] truncate max-w-[110px] text-[11px]">
                            {camp.name}
                          </p>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            {camp.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#7C756D] mt-1">
                          <span>Sent: {camp.total_sent}</span>
                          <span className="text-emerald-700 font-bold">Delivered: {camp.total_delivered}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-[#7C756D]">
                      No campaigns dispatched yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="pt-3 border-t border-[#EFE3CF] mt-3 space-y-2">
                <Link href="/campaigns">
                  <button className="w-full gold-button py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Campaign</span>
                  </button>
                </Link>
                <Link href="/flows">
                  <button className="w-full py-1.5 rounded-xl bg-white border border-[#EFE3CF] hover:border-[#DFBE7E] text-[11px] font-bold text-[#5D564E] flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                    <Layers className="w-3 h-3 text-[#C59E3F]" />
                    <span>Flow Studio</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Row Banners (3 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Banner 1: Premium Plan (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-r from-[#FDF8EC] via-[#FAF1DD] to-[#F5E5C9] border border-[#DFBE7E] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#DFBE7E] flex items-center justify-center shrink-0 shadow-xs">
                  <Crown className="w-6 h-6 text-[#C59E3F]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1E1B18]">Classic Pearl — Premium Plan</h3>
                  <p className="text-xs text-[#7C756D] font-medium mt-0.5">
                    Full WhatsApp API & Marketing Automation Enabled
                  </p>
                </div>
              </div>

              <Link href="/whatsapp">
                <button className="gold-button h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer">
                  <span>Settings</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>

            {/* Banner 2: WhatsApp Business API (4 cols) */}
            <div className="lg:col-span-4 p-5 rounded-2xl whatsapp-banner text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-tight">WhatsApp Business API</h3>
                  <p className="text-xs text-emerald-300 font-bold flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Connected & Active
                  </p>
                </div>
              </div>

              <Link href="/whatsapp">
                <button className="h-8 px-3.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors">
                  <span>Manage</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </Link>
            </div>

            {/* Banner 3: Live System Status (3 cols) */}
            <div className="lg:col-span-3 p-5 rounded-2xl cosmic-luxury-card text-center flex flex-col items-center justify-center relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1 z-10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-300">Live Production Node</span>
              </div>
              <p className="font-serif italic text-xs font-medium text-[#DFB755] leading-relaxed relative z-10">
                Classic Pearl Salon OS v2.0
              </p>
              <p className="text-[10px] text-[#C4BCB3] mt-0.5 z-10">
                {stats.totalContacts} Guests • {stats.totalConversations} Threads
              </p>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(223,183,85,0.08)_0,transparent_70%)] pointer-events-none" />
            </div>
          </div>

          {/* Bottom Luxury Footer Ribbon */}
          <div className="pt-6 pb-2 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-[#DFBE7E]" />
              <span className="text-[#C59E3F] text-xs font-serif">✦</span>
              <p className="font-serif text-[10px] font-black tracking-[0.35em] text-[#8C6514] uppercase">
                CLASSIC PEARL . LUXURY . PERFORMANCE
              </p>
              <span className="text-[#C59E3F] text-xs font-serif">✦</span>
              <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-[#DFBE7E]" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
