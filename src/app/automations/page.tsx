'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { 
  Search, 
  Plus, 
  Zap, 
  RefreshCw, 
  Power, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  MapPin,
  Sparkles,
  PhoneCall,
  Calendar,
  MessageSquare,
  Send,
  ShieldCheck,
  Timer
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from 'react-hot-toast';
import { formatISTTime } from '@/lib/meta/dailyLimitResume';

interface FollowupPipelineItem {
  id: string;
  name: string;
  phone_number: string;
  is_blocked: boolean;
  opted_in: boolean;
  inquiry_type: 'LOCATION' | 'TENTATIVE_TIME' | 'SERVICE' | 'GENERAL';
  service: string;
  inquired_at: string;
  followup_status: 'SCHEDULED' | 'SENT' | 'CANCELLED' | 'COMPLETED';
  followup_due_at: string;
  followup_count: number;
  followup_sent_at?: string;
  elapsed_hours: number;
  remaining_meta_hours: number;
  is_within_24h: boolean;
}

export default function AutomationsPage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'followups'>('followups');
  const [automations, setAutomations] = useState<any[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'CONTAINS',
    keywords: '',
    action_type: 'TEXT',
    reply_text: '',
    priority: 10,
    cooldown_seconds: 60,
    active: true
  });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Follow-up pipeline state
  const [pipeline, setPipeline] = useState<FollowupPipelineItem[]>([]);
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [processingFollowups, setProcessingFollowups] = useState(false);

  const fetchAutomations = useCallback(async () => {
    setLoadingRules(true);
    try {
      const { data } = await supabase
        .from('automations')
        .select('*')
        .order('priority', { ascending: false });

      if (data) setAutomations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRules(false);
    }
  }, []);

  const fetchFollowups = useCallback(async () => {
    setLoadingPipeline(true);
    try {
      const res = await fetch('/api/ai/followup');
      const data = await res.json();
      if (res.ok && data.pipeline) {
        setPipeline(data.pipeline);
      }
    } catch (e) {
      console.error('Failed to fetch follow-up pipeline:', e);
    } finally {
      setLoadingPipeline(false);
    }
  }, []);

  useEffect(() => {
    fetchAutomations();
    fetchFollowups();
  }, [fetchAutomations, fetchFollowups]);

  const handleRunFollowups = async (forceNow = false, targetContactId?: string) => {
    setProcessingFollowups(true);
    try {
      const res = await fetch('/api/ai/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceNow, targetContactId, limit: 25 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process follow-ups');

      const sentCount = data.stats?.sent || 0;
      const skippedCount = data.stats?.skipped || 0;

      if (sentCount > 0) {
        toast.success(`Successfully sent ${sentCount} follow-up${sentCount > 1 ? 's' : ''}!`);
      } else if (skippedCount > 0) {
        toast(`Processed: ${skippedCount} skipped (either sent, deferred for quiet hours, or customer already replied).`, { icon: 'ℹ️' });
      } else {
        toast('No pending follow-ups currently due.', { icon: 'ℹ️' });
      }

      fetchFollowups();
    } catch (err: any) {
      toast.error(err.message || 'Error processing follow-ups');
    } finally {
      setProcessingFollowups(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');

    try {
      const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
      const orgId = orgs?.[0]?.id;

      if (!orgId) {
        setFormError('No organization found. Please ensure you are logged in.');
        return;
      }

      const keywordsList = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      if (keywordsList.length === 0) {
        setFormError('Please enter at least one trigger keyword.');
        return;
      }

      const { error } = await supabase.from('automations').insert({
        organization_id: orgId,
        name: formData.name,
        trigger_type: formData.trigger_type,
        trigger_config: { keywords: keywordsList },
        action_type: formData.action_type,
        action_config: { text: formData.reply_text },
        priority: Number(formData.priority),
        cooldown_seconds: Number(formData.cooldown_seconds),
        active: formData.active
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      setShowModal(false);
      setFormData({
        name: '',
        trigger_type: 'CONTAINS',
        keywords: '',
        action_type: 'TEXT',
        reply_text: '',
        priority: 10,
        cooldown_seconds: 60,
        active: true
      });
      fetchAutomations();
      toast.success('Keyword automation created!');
    } catch (err: any) {
      setFormError('Failed to save automation.');
    } finally {
      setFormSaving(false);
    }
  };

  const toggleActive = async (automation: any) => {
    const { error } = await supabase
      .from('automations')
      .update({ active: !automation.active })
      .eq('id', automation.id);

    if (!error) {
      setAutomations(prev =>
        prev.map(a => a.id === automation.id ? { ...a, active: !a.active } : a)
      );
    }
  };

  const filteredAutomations = automations.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPipeline = pipeline.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone_number.includes(search) ||
    p.service?.toLowerCase().includes(search.toLowerCase())
  );

  const scheduledCount = pipeline.filter(p => p.followup_status === 'SCHEDULED').length;
  const sentCount = pipeline.filter(p => p.followup_status === 'SENT').length;

  return (
    <div className="flex h-screen bg-[#F7F3EA]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Automations & AI Follow-Ups"
          subtitle="Autonomous 24h Meta customer re-engagement, location check-ins, and keyword auto-replies."
          badge={
            <Badge variant="primary">
              {activeTab === 'followups' ? `${pipeline.length} Inquiries Tracked` : `${automations.length} Rules`}
            </Badge>
          }
          actions={
            <div className="flex items-center gap-2">
              {activeTab === 'followups' ? (
                <>
                  <Button
                    onClick={() => handleRunFollowups(false)}
                    isLoading={processingFollowups}
                    variant="whatsapp"
                    leftIcon={<PlayIcon className="w-3.5 h-3.5" />}
                  >
                    Run Due Follow-Ups
                  </Button>
                  <Button
                    onClick={() => handleRunFollowups(true)}
                    isLoading={processingFollowups}
                    variant="primary"
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Send All Scheduled Now
                  </Button>
                </>
              ) : (
                <Button onClick={() => { setFormError(''); setShowModal(true); }} leftIcon={<Plus className="w-4 h-4" />}>
                  New Automation
                </Button>
              )}
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex border-b border-[#E5DED2] gap-4">
            <button
              onClick={() => setActiveTab('followups')}
              className={`pb-3 px-2 text-xs font-bold transition-all relative flex items-center gap-2 ${
                activeTab === 'followups'
                  ? 'text-[#B08D57] border-b-2 border-[#B08D57]'
                  : 'text-[#706B61] hover:text-[#292722]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Smart AI Follow-Ups (24h Window)</span>
              {scheduledCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                  {scheduledCount} Queued
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`pb-3 px-2 text-xs font-bold transition-all relative flex items-center gap-2 ${
                activeTab === 'rules'
                  ? 'text-[#B08D57] border-b-2 border-[#B08D57]'
                  : 'text-[#706B61] hover:text-[#292722]'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Keyword Auto-Replies</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                {automations.length}
              </span>
            </button>
          </div>

          {activeTab === 'followups' ? (
            <div className="space-y-6">
              {/* High-Level KPI Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-white border border-[#E5DED2]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#9E968D]">Pending / Due</p>
                      <p className="text-xl font-black text-[#292722]">{scheduledCount}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-white border border-[#E5DED2]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#9E968D]">Follow-Ups Sent</p>
                      <p className="text-xl font-black text-[#292722]">{sentCount}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-white border border-[#E5DED2]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#9E968D]">Total Inquiries</p>
                      <p className="text-xl font-black text-[#292722]">{pipeline.length}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-white border border-[#E5DED2]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#9E968D]">Anti-Spam Guardrails</p>
                      <p className="text-xs font-bold text-purple-700">Max 1 • Quiet Hours • 24h Window</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Guardrails Info Banner */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 flex items-start gap-3">
                <Timer className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-950">How Salon Follow-Ups Work Autonomously</p>
                  <p className="text-amber-800 leading-relaxed">
                    Whenever a client asks for <strong>📍 Location & Directions</strong>, <strong>💇 Services & Pricing</strong>, or mentions an arrival time, the AI schedules a single gentle follow-up before the free <strong>Meta 24-Hour Customer Service Window</strong> expires. If a client replies or visits, the follow-up automatically cancels. During quiet hours (8:30 PM to 10:00 AM IST), follow-ups are safely deferred to morning opening hours.
                  </p>
                </div>
              </div>

              {/* Follow-up Pipeline Table */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-[#E5DED2] flex items-center justify-between gap-4 bg-white">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#7C756D]" />
                    <input
                      type="text"
                      placeholder="Search inquiries by client name, phone, or service..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-[#FAF7F2] border border-[#E5DED2] rounded-xl text-xs font-medium focus:bg-white focus:border-[#B08D57] transition-all outline-none"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchFollowups}
                    leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loadingPipeline ? 'animate-spin' : ''}`} />}
                  >
                    Refresh
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#FAF7F2]/70 border-b border-[#E5DED2] text-[#9E968D] font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-6 py-4">Client</th>
                        <th className="px-6 py-4">Inquiry Type</th>
                        <th className="px-6 py-4">Service Inquired</th>
                        <th className="px-6 py-4">Inquired At</th>
                        <th className="px-6 py-4">24h Meta Window</th>
                        <th className="px-6 py-4">Follow-Up Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DED2] font-medium text-[#292722]">
                      {loadingPipeline && (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-xs text-[#9E968D]">
                            Loading customer follow-up pipeline…
                          </td>
                        </tr>
                      )}
                      {!loadingPipeline && filteredPipeline.map((item) => {
                        const isLocation = item.inquiry_type === 'LOCATION';
                        const isPending = item.followup_status === 'SCHEDULED';
                        const isSent = item.followup_status === 'SENT';

                        return (
                          <tr key={item.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-[#1E1B18] text-xs">{item.name}</p>
                              <p className="text-[11px] font-mono text-[#706B61]">{item.phone_number}</p>
                            </td>

                            <td className="px-6 py-4 text-xs">
                              {isLocation ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 font-bold border border-orange-200">
                                  <MapPin className="w-3 h-3" /> Location & Maps
                                </span>
                              ) : item.inquiry_type === 'TENTATIVE_TIME' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold border border-sky-200">
                                  <Clock className="w-3 h-3" /> Arrival Time
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold border border-purple-200">
                                  <Sparkles className="w-3 h-3" /> Service Inquiry
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-xs font-semibold text-[#3E2D12]">
                              {item.service || 'Salon Visit'}
                            </td>

                            <td className="px-6 py-4 text-xs text-[#706B61]">
                              {item.inquired_at ? formatISTTime(item.inquired_at) : '—'}
                            </td>

                            <td className="px-6 py-4">
                              {item.is_within_24h ? (
                                <div className="space-y-0.5">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                    item.remaining_meta_hours > 8
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : item.remaining_meta_hours > 2
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}>
                                    ⏱ {item.remaining_meta_hours} hrs left
                                  </span>
                                  <p className="text-[9px] text-[#9E968D]">Free session window</p>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">
                                  Expired (&gt;24h)
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <Badge
                                variant={
                                  isSent ? 'success' :
                                  isPending ? 'warning' :
                                  item.followup_status === 'CANCELLED' ? 'default' : 'primary'
                                }
                                dot={isPending || isSent}
                              >
                                {isSent ? 'Sent ✓' : isPending ? 'Scheduled' : item.followup_status}
                              </Badge>
                              {isPending && item.followup_due_at && (
                                <p className="text-[9px] text-[#9E968D] mt-0.5">
                                  Due: {formatISTTime(item.followup_due_at)}
                                </p>
                              )}
                              {isSent && item.followup_sent_at && (
                                <p className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                                  {formatISTTime(item.followup_sent_at)}
                                </p>
                              )}
                            </td>

                            <td className="px-6 py-4 text-right">
                              {isPending && item.is_within_24h ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleRunFollowups(true, item.id)}
                                  isLoading={processingFollowups}
                                  leftIcon={<Send className="w-3 h-3" />}
                                >
                                  Send Now
                                </Button>
                              ) : isSent ? (
                                <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#9E968D]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {!loadingPipeline && filteredPipeline.length === 0 && (
                        <tr>
                          <td colSpan={7}>
                            <EmptyState
                              icon={Sparkles}
                              title="No inquiries currently active"
                              description="When clients ask for location, services, or arrival times on WhatsApp, they will automatically appear here with their 24-hour Meta countdown."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : (
            /* Keyword Rules Tab */
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-[#E5DED2] flex items-center justify-between gap-4 bg-white">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#7C756D]" />
                  <input
                    type="text"
                    placeholder="Search automations by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#FAF7F2] border border-[#E5DED2] rounded-xl text-xs font-medium focus:bg-white focus:border-[#B08D57] transition-all outline-none"
                  />
                </div>

                <Button variant="outline" size="sm" onClick={fetchAutomations} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loadingRules ? 'animate-spin' : ''}`} />}>
                  Refresh
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#FAF7F2]/70 border-b border-[#E5DED2] text-[#9E968D] font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-4">Rule Name</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Trigger Mode</th>
                      <th className="px-6 py-4">Keywords</th>
                      <th className="px-6 py-4">Priority</th>
                      <th className="px-6 py-4">Cooldown</th>
                      <th className="px-6 py-4 text-right">Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DED2] font-medium text-[#292722]">
                    {filteredAutomations.map((automation) => {
                      const config = automation.trigger_config as { keywords?: string[] } || {};
                      const keywords = config.keywords || [];

                      return (
                        <tr key={automation.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                          <td className="px-6 py-4 font-bold text-xs">
                            {automation.name}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={automation.active ? 'success' : 'default'} dot={automation.active}>
                              {automation.active ? 'Active' : 'Disabled'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-[#E5DED2]">
                              {automation.trigger_type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1.5 flex-wrap max-w-xs">
                              {keywords.map((kw: string, i: number) => (
                                <span key={i} className="text-xs bg-[#B08D57]/10 text-[#B08D57] font-semibold px-2 py-0.5 rounded-md border border-[#B08D57]/20">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold">
                            {automation.priority}
                          </td>
                          <td className="px-6 py-4 text-xs text-[#706B61]">
                            {automation.cooldown_seconds}s
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => toggleActive(automation)}
                              className={`p-2 rounded-xl transition-all ${
                                automation.active
                                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                              title={automation.active ? 'Disable' : 'Enable'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredAutomations.length === 0 && !loadingRules && (
                      <tr>
                        <td colSpan={7}>
                          <EmptyState
                            icon={Zap}
                            title="No automations configured"
                            description="Create keyword-triggered instant auto-replies to answer common customer inquiries 24/7."
                            actionLabel="New Automation"
                            onAction={() => setShowModal(true)}
                            actionIcon={<Plus className="w-4 h-4" />}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* New Automation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Keyword Automation"
        description="Trigger instant WhatsApp responses based on customer keyword matches."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          <Input
            label="Rule Name *"
            placeholder="e.g. Pricing FAQ Auto-Reply"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#706B61] uppercase tracking-wider mb-1.5">
                Match Strategy
              </label>
              <select
                value={formData.trigger_type}
                onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5DED2] rounded-xl text-xs font-medium text-[#292722] outline-none focus:border-[#B08D57]"
              >
                <option value="CONTAINS">Contains (Fuzzy match anywhere)</option>
                <option value="EXACT">Exact Match (Full phrase)</option>
              </select>
            </div>

            <Input
              label="Priority (0-100)"
              type="number"
              min="0"
              max="100"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Trigger Keywords *"
            placeholder="price, pricing, cost, rates"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            helperText="Separate multiple trigger keywords with commas."
            required
          />

          <Textarea
            label="Auto-Reply Text Body *"
            rows={3}
            placeholder="Hello! Our haircut and grooming services start from ₹249 with Italian RICA products."
            value={formData.reply_text}
            onChange={(e) => setFormData({ ...formData, reply_text: e.target.value })}
            required
          />

          <Input
            label="Cooldown Window (Seconds)"
            type="number"
            min="0"
            value={formData.cooldown_seconds}
            onChange={(e) => setFormData({ ...formData, cooldown_seconds: Number(e.target.value) })}
            helperText="Prevents repeat replies to the same customer within this window."
          />

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5DED2]">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={formSaving}>
              Save Automation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function PlayIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
