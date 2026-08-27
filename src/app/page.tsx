'use client';

import { useState, useEffect } from 'react';
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
  ArrowUpRight,
  Shield,
  Sparkles,
  Phone,
  CheckCircle2,
  Gem,
  Award,
  Layers,
  Layout,
  Briefcase,
  Building2
} from "lucide-react";
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalConversations: 2856,
    unreadMessages: 96,
    activeCampaigns: 24,
    totalContacts: 12985,
    sentMessages: 12256,
    deliveredMessages: 10429,
    readMessages: 8956,
    repliedMessages: 6325,
    successRate: 85
  });

  const [recentConversations, setRecentConversations] = useState([
    {
      name: "Priya Sharma",
      message: "Thank you so much! Appointment confirmed.",
      time: "10:30 AM",
      unread: 3,
      avatar: "PS",
      avatarBg: "from-amber-200 to-amber-400"
    },
    {
      name: "Rahul Verma",
      message: "Can you share the offers for this month?",
      time: "10:28 AM",
      unread: 2,
      avatar: "RV",
      avatarBg: "from-emerald-200 to-emerald-400"
    },
    {
      name: "Neha Kapoor",
      message: "Loved the service! Will visit again",
      time: "10:25 AM",
      unread: 1,
      avatar: "NK",
      avatarBg: "from-purple-200 to-purple-400"
    },
    {
      name: "Ankit Patel",
      message: "Need haircut and beard styling",
      time: "10:20 AM",
      unread: 0,
      avatar: "AP",
      avatarBg: "from-blue-200 to-blue-400"
    },
    {
      name: "Simran Kaur",
      message: "Do you have any bridal packages?",
      time: "10:18 AM",
      unread: 4,
      avatar: "SK",
      avatarBg: "from-rose-200 to-rose-400"
    }
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const [contactsRes, messagesRes, campaignsRes] = await Promise.all([
          supabase.from('contacts').select('id', { count: 'exact', head: true }),
          supabase.from('messages').select('id', { count: 'exact', head: true }),
          supabase.from('campaigns').select('id', { count: 'exact', head: true })
        ]);

        if (contactsRes.count && contactsRes.count > 0) {
          setStats(prev => ({
            ...prev,
            totalContacts: contactsRes.count || prev.totalContacts,
            totalConversations: messagesRes.count || prev.totalConversations,
            activeCampaigns: campaignsRes.count || prev.activeCampaigns
          }));
        }
      } catch (e) {
        console.log('Using salon defaults');
      }
    }

    loadData();
  }, []);

  return (
    <div className="flex h-screen bg-[#F7F3EA] text-[#1E1B18] font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopBar />

        <main className="p-6 sm:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* Greeting Header & Date Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B18] tracking-tight flex items-center gap-2">
                <span>Welcome Back, Classic Pearls Salon</span>
                <span className="text-2xl animate-pulse">👋</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#7C756D] font-medium mt-1">
                Here&apos;s what&apos;s happening with your business today.
              </p>
            </div>

            {/* Date Picker Button */}
            <div className="flex items-center gap-2">
              <button className="h-10 px-4 rounded-full bg-white border border-[#EFE3CF] hover:border-[#DFBE7E] shadow-xs text-xs font-bold text-[#3E2D12] flex items-center gap-2.5 transition-all cursor-pointer">
                <CalendarIcon className="w-4 h-4 text-[#C59E3F]" />
                <span>Tuesday, 26 Aug 2026</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8C827A]" />
              </button>
            </div>
          </div>

          {/* Top 4 KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Total Conversations */}
            <div className="card-luxury p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C756D]">
                <span>Total Conversations</span>
                <span className="text-[#C4BCB3] group-hover:text-[#7C756D] cursor-pointer">•••</span>
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
                <span>18.5% from last 7 days</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#FDE68A] to-transparent" />
            </div>

            {/* 2. Unread Messages */}
            <div className="card-luxury p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C756D]">
                <span>Unread Messages</span>
                <span className="text-[#C4BCB3] group-hover:text-[#7C756D] cursor-pointer">•••</span>
              </div>
              <div className="flex items-center justify-between my-3">
                <h3 className="text-3xl font-black text-[#1E1B18] tracking-tight">
                  {stats.unreadMessages.toLocaleString()}
                </h3>
                <div className="w-12 h-12 rounded-full bg-[#FEF9C3] border border-[#FEF08A] text-[#CA8A04] flex items-center justify-center shrink-0 shadow-xs">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#059669]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>12.7% from last 7 days</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#FEF08A] to-transparent" />
            </div>

            {/* 3. Active Campaigns */}
            <div className="card-luxury p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C756D]">
                <span>Active Campaigns</span>
                <span className="text-[#C4BCB3] group-hover:text-[#7C756D] cursor-pointer">•••</span>
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
                <span>8.3% from last 7 days</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#BBF7D0] to-transparent" />
            </div>

            {/* 4. Total Contacts */}
            <div className="card-luxury p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C756D]">
                <span>Total Contacts</span>
                <span className="text-[#C4BCB3] group-hover:text-[#7C756D] cursor-pointer">•••</span>
              </div>
              <div className="flex items-center justify-between my-3">
                <h3 className="text-3xl font-black text-[#1E1B18] tracking-tight">
                  {stats.totalContacts.toLocaleString()}
                </h3>
                <div className="w-12 h-12 rounded-full bg-[#F3E8FF] border border-[#E9D5FF] text-[#9333EA] flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#059669]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>22.1% from last 7 days</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#E9D5FF] to-transparent" />
            </div>
          </div>

          {/* Middle Row Grid (4 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Recent Conversations (3.5 cols) */}
            <div className="lg:col-span-3 card-luxury p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE3CF]">
                  <h2 className="text-sm font-bold text-[#1E1B18]">Recent Conversations</h2>
                  <Link href="/inbox" className="text-xs font-bold text-[#B88B2A] hover:underline cursor-pointer">
                    View All
                  </Link>
                </div>

                <div className="divide-y divide-[#EFE3CF]/60 mt-2">
                  {recentConversations.map((conv, idx) => (
                    <Link
                      key={idx}
                      href="/inbox"
                      className="py-3 flex items-center justify-between group hover:bg-[#FAF7F2] -mx-2 px-2 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${conv.avatarBg} text-[#3E2D12] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs border border-white`}>
                          {conv.avatar}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1E1B18] truncate group-hover:text-[#B88B2A] transition-colors">
                            {conv.name}
                          </p>
                          <p className="text-[11px] text-[#7C756D] truncate mt-0.5 max-w-[140px]">
                            {conv.message}
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
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Analytics Overview (4.5 cols) */}
            <div className="lg:col-span-4 card-luxury p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE3CF]">
                  <h2 className="text-sm font-bold text-[#1E1B18]">Analytics Overview</h2>
                  <button className="h-7 px-2.5 rounded-lg bg-white border border-[#EFE3CF] text-[11px] font-bold text-[#5D564E] flex items-center gap-1.5 cursor-pointer hover:border-[#DFBE7E]">
                    <span>This Week</span>
                    <ChevronDown className="w-3 h-3 text-[#8C827A]" />
                  </button>
                </div>

                {/* Golden Line Area Graph */}
                <div className="py-4 relative">
                  <div className="h-40 w-full relative flex items-end justify-between px-2 pt-6">
                    {/* SVG Curve Line */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 120">
                      <defs>
                        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#DFB755" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#DFB755" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Area Fill */}
                      <path
                        d="M 0 100 Q 40 85, 80 65 T 160 30 T 220 55 T 300 35 L 300 120 L 0 120 Z"
                        fill="url(#goldGradient)"
                      />
                      {/* Stroke Line */}
                      <path
                        d="M 0 100 Q 40 85, 80 65 T 160 30 T 220 55 T 300 35"
                        fill="none"
                        stroke="#C59E3F"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      {/* Peak Point */}
                      <circle cx="160" cy="30" r="5" fill="#FFFFFF" stroke="#C59E3F" strokeWidth="3" />
                    </svg>

                    {/* Tooltip Badge at Peak */}
                    <div className="absolute left-[48%] top-2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-white border border-[#DFBE7E] shadow-sm text-[10px] font-extrabold text-[#7A5714]">
                      785
                    </div>

                    {/* X-Axis Labels */}
                    <div className="w-full flex justify-between text-[10px] font-bold text-[#9E968D] pt-2 border-t border-[#EFE3CF]/60 z-10">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom 3 Summary Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#EFE3CF] text-center">
                <div className="p-2 rounded-xl bg-[#FAF7F2]">
                  <p className="text-[10px] text-[#7C756D] font-bold">New Contacts</p>
                  <p className="text-sm font-black text-[#1E1B18] mt-0.5">1,245</p>
                  <span className="text-[9px] font-bold text-[#059669]">↑ 15.3%</span>
                </div>
                <div className="p-2 rounded-xl bg-[#FAF7F2]">
                  <p className="text-[10px] text-[#7C756D] font-bold">Messages Sent</p>
                  <p className="text-sm font-black text-[#1E1B18] mt-0.5">8,659</p>
                  <span className="text-[9px] font-bold text-[#059669]">↑ 19.8%</span>
                </div>
                <div className="p-2 rounded-xl bg-[#FAF7F2]">
                  <p className="text-[10px] text-[#7C756D] font-bold">Response Rate</p>
                  <p className="text-sm font-black text-[#1E1B18] mt-0.5">98.6%</p>
                  <span className="text-[9px] font-bold text-[#059669]">↑ 6.2%</span>
                </div>
              </div>
            </div>

            {/* Column 3: Campaign Performance (2.5 cols) */}
            <div className="lg:col-span-3 card-luxury p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE3CF]">
                  <h2 className="text-sm font-bold text-[#1E1B18]">Campaign Performance</h2>
                  <button className="h-7 px-2 rounded-lg bg-white border border-[#EFE3CF] text-[10px] font-bold text-[#5D564E] flex items-center gap-1 cursor-pointer hover:border-[#DFBE7E]">
                    <span>This Month</span>
                    <ChevronDown className="w-3 h-3 text-[#8C827A]" />
                  </button>
                </div>

                {/* Donut Chart Gauge */}
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
                        strokeDasharray="85, 100"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center text-center">
                      <span className="text-2xl font-black text-[#1E1B18]">85%</span>
                      <span className="text-[9px] font-bold text-[#7C756D] uppercase">Success Rate</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Metric Rows */}
              <div className="space-y-2 pt-3 border-t border-[#EFE3CF] text-xs font-bold">
                <div className="flex items-center justify-between text-[#5D564E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span>Sent</span>
                  </div>
                  <span className="text-[#1E1B18] font-black">{stats.sentMessages.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[#5D564E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span>Delivered</span>
                  </div>
                  <span className="text-[#1E1B18] font-black">{stats.deliveredMessages.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[#5D564E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" />
                    <span>Read</span>
                  </div>
                  <span className="text-[#1E1B18] font-black">{stats.readMessages.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[#5D564E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                    <span>Replied</span>
                  </div>
                  <span className="text-[#1E1B18] font-black">{stats.repliedMessages.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Column 4: Why This Palette? Guide Panel (2 cols) */}
            <div className="lg:col-span-2 card-luxury p-4 flex flex-col justify-between text-xs">
              <div>
                <h3 className="font-serif font-black text-xs text-[#8C6514] uppercase tracking-wider mb-3">
                  Why This Palette?
                </h3>

                <div className="space-y-3">
                  {/* Royal Gold */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#FEF3C7] text-[#C59E3F] flex items-center justify-center shrink-0 border border-[#FDE68A]">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1E1B18] leading-tight">Royal Gold</p>
                      <p className="text-[10px] text-[#7C756D] leading-tight mt-0.5">
                        Represents success, wealth and premium quality.
                      </p>
                    </div>
                  </div>

                  {/* Pearl White */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#FAF7F2] text-[#8C827A] flex items-center justify-center shrink-0 border border-[#EFE3CF]">
                      <Gem className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1E1B18] leading-tight">Pearl White</p>
                      <p className="text-[10px] text-[#7C756D] leading-tight mt-0.5">
                        Adds purity, clarity and a clean luxury feel.
                      </p>
                    </div>
                  </div>

                  {/* Amethyst Purple */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0 border border-[#E9D5FF]">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1E1B18] leading-tight">Amethyst Purple</p>
                      <p className="text-[10px] text-[#7C756D] leading-tight mt-0.5">
                        Signifies elegance, depth and creativity.
                      </p>
                    </div>
                  </div>

                  {/* Emerald Green */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0 border border-[#BBF7D0]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1E1B18] leading-tight">Emerald Green</p>
                      <p className="text-[10px] text-[#7C756D] leading-tight mt-0.5">
                        Brings balance, growth and prosperity.
                      </p>
                    </div>
                  </div>

                  {/* Warm Taupe */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#F2ECE0] text-[#7C756D] flex items-center justify-center shrink-0 border border-[#E2D7C3]">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1E1B18] leading-tight">Warm Taupe</p>
                      <p className="text-[10px] text-[#7C756D] leading-tight mt-0.5">
                        Creates a calm, professional and timeless base.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Perfect For Section */}
              <div className="pt-3 border-t border-[#EFE3CF] mt-3">
                <h4 className="font-serif font-black text-[11px] text-[#8C6514] uppercase tracking-wider mb-2">
                  Perfect For
                </h4>
                <div className="space-y-1.5 text-[10px] font-bold text-[#5D564E]">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-[#C59E3F]" />
                    <span>CRM Software</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layout className="w-3 h-3 text-[#C59E3F]" />
                    <span>Dashboard Systems</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3 h-3 text-[#C59E3F]" />
                    <span>Premium SaaS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3 h-3 text-[#C59E3F]" />
                    <span>Business Platforms</span>
                  </div>
                </div>
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
                  <h3 className="text-sm font-black text-[#1E1B18]">You&apos;re using Premium Plan</h3>
                  <p className="text-xs text-[#7C756D] font-medium mt-0.5">
                    Unlock more features & grow your business
                  </p>
                </div>
              </div>

              <Link href="/whatsapp">
                <button className="gold-button h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer">
                  <span>Upgrade Now</span>
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

            {/* Banner 3: Cosmic Luxury Quote Card (3 cols) */}
            <div className="lg:col-span-3 p-5 rounded-2xl cosmic-luxury-card text-center flex flex-col items-center justify-center relative overflow-hidden">
              <p className="font-serif italic text-xs font-medium text-[#DFB755] leading-relaxed relative z-10">
                <span className="text-base font-serif text-[#C59E3F] mr-1">❝</span>
                Designed for those who never compromise.
                <span className="text-base font-serif text-[#C59E3F] ml-1">❞</span>
              </p>
              {/* Subtle Stardust Background Highlight */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(223,183,85,0.08)_0,transparent_70%)] pointer-events-none" />
            </div>
          </div>

          {/* Bottom Luxury Footer Ribbon */}
          <div className="pt-6 pb-2 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-[#DFBE7E]" />
              <span className="text-[#C59E3F] text-xs font-serif">✦</span>
              <p className="font-serif text-[10px] font-black tracking-[0.35em] text-[#8C6514] uppercase">
                LUXURY . POWER . ELEGANCE . PERFORMANCE .
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
