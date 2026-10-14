'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { diagnoseMetaError, ErrorDiagnosis } from '@/lib/meta/errorDiagnosis';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  CheckCircle2,
  CheckCheck,
  Check,
  Clock,
  AlertTriangle,
  AlertCircle,
  Search,
  Users,
  Send,
  Smartphone,
  Eye,
  XCircle,
  HelpCircle,
  RotateCcw,
  FileSpreadsheet,
  Calendar,
  Filter
} from 'lucide-react';

function formatExactDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export default function CampaignFullReportPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = use(params);
  const router = useRouter();

  const [campaign, setCampaign] = useState<any | null>(null);
  const [template, setTemplate] = useState<any | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [dailyLimitDetails, setDailyLimitDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READ' | 'DELIVERED' | 'SENT' | 'FAILED' | 'QUEUED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const fetchReport = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/campaigns/${campaignId}/recipients`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data.campaign || null);
        setTemplate(data.template || null);
        setRecipients(data.recipients || []);
        setDailyLimitDetails(data.daily_limit_details || null);
      }
    } catch (err) {
      console.error('Failed to load campaign report:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchReport();

    const channel = supabase
      .channel(`campaign-report-${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_recipients', filter: `campaign_id=eq.${campaignId}` },
        () => fetchReport(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` },
        () => fetchReport(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchReport]);

  // Auto-drive worker only if campaign has active PENDING / PROCESSING items or due SCHEDULED items
  useEffect(() => {
    const nowMs = Date.now();
    const hasActiveQueue = recipients.some(r => {
      if (r.status === 'PENDING' || r.status === 'PROCESSING') return true;
      if (r.status === 'SCHEDULED' && r.scheduled_at && new Date(r.scheduled_at).getTime() <= nowMs) return true;
      return false;
    });

    if (!hasActiveQueue) return;

    const timer = setInterval(() => {
      fetch('/api/whatsapp/campaigns/worker', { headers: { 'x-ui-bypass': 'true' } })
        .then(() => fetchReport(true))
        .catch(() => {});
    }, 4000);

    return () => clearInterval(timer);
  }, [recipients, fetchReport]);

  // Metrics Calculation
  const totalRecipients = recipients.length;
  const sentTotal = recipients.filter(r => ['SENT', 'DELIVERED', 'READ'].includes(r.status)).length;
  const reachedDeliveredTotal = recipients.filter(r => ['DELIVERED', 'READ'].includes(r.status)).length;
  const readSeenTotal = recipients.filter(r => r.status === 'READ').length;
  const deliveredNotReadCount = recipients.filter(r => r.status === 'DELIVERED').length;
  const sentInTransitCount = recipients.filter(r => r.status === 'SENT').length;
  const failedTotal = recipients.filter(r => r.status === 'FAILED').length;
  const queuedTotal = recipients.filter(r => ['PENDING', 'SCHEDULED', 'PROCESSING'].includes(r.status)).length;

  const sentPct = totalRecipients > 0 ? Math.round((sentTotal / totalRecipients) * 100) : 0;
  const deliveredPct = totalRecipients > 0 ? Math.round((reachedDeliveredTotal / totalRecipients) * 100) : 0;
  const readPct = reachedDeliveredTotal > 0 ? Math.round((readSeenTotal / reachedDeliveredTotal) * 100) : 0;
  const failedPct = totalRecipients > 0 ? Math.round((failedTotal / totalRecipients) * 100) : 0;

  const dailyLimitCount = recipients.filter(
    r => r.error_code === 'DAILY_LIMIT_REACHED' || (r.error_message && r.error_message.includes('daily limit'))
  ).length;

  // Group Failed Recipients by Diagnosis Category
  const failureGroups: Record<
    string,
    { count: number; diag: ErrorDiagnosis; examples: { name: string; phone: string }[] }
  > = {};

  recipients
    .filter(r => r.status === 'FAILED')
    .forEach(r => {
      const diag = diagnoseMetaError(r.error_code, r.error_message);
      if (!failureGroups[diag.category]) {
        failureGroups[diag.category] = { count: 0, diag, examples: [] };
      }
      failureGroups[diag.category].count++;
      if (failureGroups[diag.category].examples.length < 4) {
        failureGroups[diag.category].examples.push({
          name: r.contact_name || 'Client',
          phone: r.phone_number
        });
      }
    });

  // Immediate Resume / Retry Handler
  const handleResumeNow = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/whatsapp/campaigns/${campaignId}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESUME_NOW' })
      });
      if (res.ok) {
        await fetch('/api/whatsapp/campaigns/worker', { headers: { 'x-ui-bypass': 'true' } });
        await fetchReport();
      }
    } finally {
      setRetrying(false);
    }
  };

  // Schedule / Reschedule Auto-Resume
  const handleScheduleAutoResume = async (customResumeAt?: string) => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/whatsapp/campaigns/${campaignId}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SCHEDULE_AUTO_RESUME', resume_at: customResumeAt })
      });
      if (res.ok) {
        await fetchReport();
      }
    } finally {
      setRetrying(false);
    }
  };

  // Cancel Auto-Resume
  const handleCancelAutoResume = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/whatsapp/campaigns/${campaignId}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL_AUTO_RESUME' })
      });
      if (res.ok) {
        await fetchReport();
      }
    } finally {
      setRetrying(false);
    }
  };

  // Export Full Person-by-Person Report (.xlsx)
  const exportFullReportExcel = () => {
    const rows = recipients.map((r, index) => {
      const diag = r.status === 'FAILED' ? diagnoseMetaError(r.error_code, r.error_message) : null;
      return {
        'S.No': index + 1,
        'Client Name': r.contact_name || 'Client',
        'Phone Number': r.phone_number,
        'Delivery Status':
          r.status === 'READ'
            ? 'READ (Seen by Client)'
            : r.status === 'DELIVERED'
            ? 'DELIVERED (Reached Phone)'
            : r.status === 'SENT'
            ? 'SENT (In Transit to Handset)'
            : r.error_code === 'DAILY_LIMIT_REACHED'
            ? 'HELD BACK (Meta Daily Limit Reached)'
            : r.status === 'FAILED'
            ? 'FAILED (Not Delivered)'
            : 'QUEUED / PENDING',
        'Sent Time': formatExactDateTime(r.sent_at),
        'Delivered Time': formatExactDateTime(r.delivered_at),
        'Read / Seen Time': formatExactDateTime(r.read_at),
        'Failed Time': formatExactDateTime(r.failed_at),
        'Issue / Failure Category': diag ? diag.category : 'None',
        'Why Not Sent / Failure Reason': diag ? `${diag.humanTitle} — ${diag.explanation}` : 'Successfully processed',
        'How to Overcome / Fix': diag ? diag.actionableRemedy : 'No action required',
        'Meta Error Code': r.error_code || '—',
        'Meta Message ID': r.meta_message_id || '—'
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Full_Campaign_Report');
    XLSX.writeFile(wb, `${(campaign?.name || 'Campaign').replace(/\s+/g, '_')}_Full_Report.xlsx`);
  };

  // Export Failed Only (.xlsx)
  const exportFailedOnlyExcel = () => {
    const failedRows = recipients
      .filter(r => r.status === 'FAILED')
      .map((r, index) => {
        const diag = diagnoseMetaError(r.error_code, r.error_message);
        return {
          'S.No': index + 1,
          'Client Name': r.contact_name || 'Client',
          'Phone Number': r.phone_number,
          'Failed At': formatExactDateTime(r.failed_at || r.sent_at),
          'Error Category': diag.category,
          'What is the Issue?': diag.humanTitle,
          'Why It Failed': diag.explanation,
          'How to Overcome': diag.actionableRemedy,
          'Meta Error Code': r.error_code || diag.code
        };
      });

    if (failedRows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(failedRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Failed_Recipients');
    XLSX.writeFile(wb, `${(campaign?.name || 'Campaign').replace(/\s+/g, '_')}_Failed_Numbers.xlsx`);
  };

  // Filter Recipients for Table
  const filteredRecipients = recipients.filter(r => {
    if (statusFilter === 'READ' && r.status !== 'READ') return false;
    if (statusFilter === 'DELIVERED' && !['DELIVERED', 'READ'].includes(r.status)) return false;
    if (statusFilter === 'SENT' && r.status !== 'SENT') return false;
    if (statusFilter === 'FAILED' && r.status !== 'FAILED') return false;
    if (statusFilter === 'QUEUED' && !['PENDING', 'SCHEDULED', 'PROCESSING'].includes(r.status)) return false;

    if (categoryFilter) {
      if (r.status !== 'FAILED') return false;
      const diag = diagnoseMetaError(r.error_code, r.error_message);
      if (diag.category !== categoryFilter) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (r.contact_name || '').toLowerCase();
      const phone = (r.phone_number || '').toLowerCase();
      const wam = (r.meta_message_id || '').toLowerCase();
      const err = (r.error_message || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || wam.includes(q) || err.includes(q);
    }

    return true;
  });

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title={campaign ? `Broadcast Report: ${campaign.name}` : 'Broadcast Analytics & Recipient Report'}
          subtitle="Complete person-by-person delivery timestamps, read receipts, failure root-cause analysis, and remediation guide."
          badge={
            campaign ? (
              <Badge
                variant={
                  campaign.status === 'COMPLETED'
                    ? 'success'
                    : campaign.status === 'PROCESSING' || campaign.status === 'RUNNING'
                    ? 'primary'
                    : campaign.status === 'FAILED'
                    ? 'danger'
                    : 'warning'
                }
                dot
              >
                {campaign.status}
              </Badge>
            ) : undefined
          }
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/campaigns')}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Back to Campaigns
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchReport()}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              >
                Refresh Live Status
              </Button>

              {(failedTotal > 0 || queuedTotal > 0) && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleResumeNow}
                  isLoading={retrying}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Resume / Retry ({failedTotal + queuedTotal})
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={exportFullReportExcel}
                leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
              >
                Export Full Report (.xlsx)
              </Button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* Daily Limit Auto-Resume & Circuit Breaker Banner */}
          {(dailyLimitCount > 0 || dailyLimitDetails || campaign?.status === 'SCHEDULED' || campaign?.description?.includes('daily limit')) && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-50/95 via-orange-50/80 to-amber-50 border-2 border-amber-300 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-300/80 flex items-center justify-center shrink-0 shadow-inner">
                    <Clock className="w-6 h-6 text-amber-900 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-amber-950">
                        Meta 24-Hour Limit Reached • Auto-Resume Scheduled
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-black uppercase tracking-wider border border-amber-300">
                        {dailyLimitDetails?.heldBackCount || dailyLimitCount} Held Back Safely
                      </span>
                    </div>
                    <p className="text-xs text-amber-900/90 font-medium mt-0.5 leading-relaxed">
                      Broadcast paused the moment Meta Tier 1 daily quota was hit. Zero remaining contacts were spammed.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleResumeNow}
                    isLoading={retrying}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Resume Now (Override)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelAutoResume}
                    disabled={retrying}
                    className="border-amber-300 text-amber-950 hover:bg-amber-100/80"
                  >
                    Cancel Auto-Resume
                  </Button>
                </div>
              </div>

              {/* 4 Execution Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-amber-200/90">
                <div className="p-3.5 rounded-xl bg-white/90 border border-amber-200 shadow-2xs">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">1. Stopped At</p>
                  <p className="text-sm font-bold text-amber-950 mt-1">
                    {dailyLimitDetails?.displayStopped || 'Earlier today'}
                  </p>
                  <p className="text-[11px] text-amber-700/80 mt-0.5">Meta 250 quota reached</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/90 border border-amber-200 shadow-2xs">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">2. Auto-Resume Target</p>
                  <p className="text-sm font-bold text-amber-950 mt-1">
                    {dailyLimitDetails?.displayResume || 'Tomorrow at 8:00 AM'}
                  </p>
                  <p className="text-[11px] text-amber-700/80 mt-0.5">Rolling 24h reset window</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/90 border border-amber-200 shadow-2xs">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">3. Live Countdown</p>
                  <p className="text-sm font-bold text-emerald-800 mt-1">
                    {dailyLimitDetails?.formattedCountdown || 'Due tomorrow'}
                  </p>
                  <p className="text-[11px] text-emerald-700/80 mt-0.5">Background runner ready</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/90 border border-amber-200 shadow-2xs">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">4. Delivery Status</p>
                  <p className="text-sm font-bold text-amber-950 mt-1">
                    {sentTotal} Delivered / {dailyLimitDetails?.heldBackCount || dailyLimitCount} Held
                  </p>
                  <p className="text-[11px] text-amber-700/80 mt-0.5">Ready for next batch</p>
                </div>
              </div>

              <div className="text-[11px] text-amber-950/90 bg-amber-100/70 p-3 rounded-xl border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>
                  💡 <strong>100% Autonomous:</strong> You do NOT need to keep this computer or browser tab open. Our background engine triggers automatically at the reset time to send the remaining contacts.
                </span>
                <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-200/60 border border-amber-300 shrink-0">
                  Tier 1 Protection
                </span>
              </div>
            </div>
          )}

          {/* 1. Executive Delivery KPIs (6 Granular Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Total Audience */}
            <div
              onClick={() => { setStatusFilter('ALL'); setCategoryFilter(null); }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === 'ALL' && !categoryFilter
                  ? 'bg-white border-[#B88B2A] ring-2 ring-[#DFBE7E]/30 shadow-sm'
                  : 'bg-white border-[#EFE3CF] hover:border-[#DFBE7E]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C756D]">1. Total Targeted</span>
                <Users className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-2xl font-extrabold text-[#1E1B18] mt-1.5">{totalRecipients}</p>
              <p className="text-[11px] text-[#7C756D] font-medium mt-0.5">100% total audience</p>
            </div>

            {/* Dispatched / Sent */}
            <div
              onClick={() => { setStatusFilter('ALL'); setCategoryFilter(null); }}
              className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 cursor-pointer hover:bg-indigo-50 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">2. Sent to Meta</span>
                <Send className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <p className="text-2xl font-extrabold text-indigo-950">{sentTotal}</p>
                <span className="text-xs font-bold text-indigo-700">({sentPct}%)</span>
              </div>
              <p className="text-[11px] text-indigo-700 font-medium mt-0.5">Dispatched by API</p>
            </div>

            {/* Reached / Delivered */}
            <div
              onClick={() => { setStatusFilter('DELIVERED'); setCategoryFilter(null); }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === 'DELIVERED'
                  ? 'bg-emerald-100/80 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">3. Reached (Delivered)</span>
                <Smartphone className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <p className="text-2xl font-extrabold text-emerald-950">{reachedDeliveredTotal}</p>
                <span className="text-xs font-bold text-emerald-700">({deliveredPct}%)</span>
              </div>
              <p className="text-[11px] text-emerald-800 font-medium mt-0.5">Delivered to client phone</p>
            </div>

            {/* Read / Seen */}
            <div
              onClick={() => { setStatusFilter('READ'); setCategoryFilter(null); }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === 'READ'
                  ? 'bg-sky-100/80 border-sky-500 ring-2 ring-sky-500/20'
                  : 'bg-sky-50/70 border-sky-200 hover:bg-sky-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">4. Read (Seen)</span>
                <CheckCheck className="w-4 h-4 text-sky-600" />
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <p className="text-2xl font-extrabold text-sky-950">{readSeenTotal}</p>
                <span className="text-xs font-bold text-sky-700">({readPct}% of reached)</span>
              </div>
              <p className="text-[11px] text-sky-800 font-medium mt-0.5">Opened & seen by client</p>
            </div>

            {/* Sent / In Transit */}
            <div
              onClick={() => { setStatusFilter('SENT'); setCategoryFilter(null); }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === 'SENT'
                  ? 'bg-amber-100/80 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-amber-50/70 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">5. In Transit (Sent)</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-extrabold text-amber-950 mt-1.5">{sentInTransitCount}</p>
              <p className="text-[11px] text-amber-800 font-medium mt-0.5">Awaiting phone online</p>
            </div>

            {/* Failed / Not Sent / Held Back */}
            <div
              onClick={() => { setStatusFilter('FAILED'); setCategoryFilter(null); }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === 'FAILED'
                  ? 'bg-rose-100/80 border-rose-500 ring-2 ring-rose-500/20'
                  : 'bg-rose-50/70 border-rose-200 hover:bg-rose-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                  {dailyLimitCount > 0 ? '6. Limit Held Back' : '6. Failed / Not Sent'}
                </span>
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <p className="text-2xl font-extrabold text-rose-950">{failedTotal}</p>
                <span className="text-xs font-bold text-rose-700">({failedPct}%)</span>
              </div>
              <p className="text-[11px] text-rose-800 font-medium mt-0.5">
                {dailyLimitCount > 0 ? `${dailyLimitCount} held back by daily limit` : 'Click to view failure reasons'}
              </p>
            </div>
          </div>

          {/* 2. Campaign Metadata & Visual Delivery Funnel */}
          <Card className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-[#EFE3CF] text-xs">
              <div>
                <p className="text-[#9E968D] font-bold uppercase tracking-wider text-[10px]">Template Used</p>
                <p className="font-mono font-bold text-[#1E1B18] mt-1">
                  {campaign?.template_name || '—'} ({campaign?.template_language || 'en_US'})
                </p>
              </div>
              <div>
                <p className="text-[#9E968D] font-bold uppercase tracking-wider text-[10px]">Campaign Created</p>
                <p className="font-semibold text-[#1E1B18] mt-1">{formatExactDateTime(campaign?.created_at)}</p>
              </div>
              <div>
                <p className="text-[#9E968D] font-bold uppercase tracking-wider text-[10px]">Broadcast Started</p>
                <p className="font-semibold text-[#1E1B18] mt-1">
                  {formatExactDateTime(campaign?.started_at || campaign?.scheduled_at)}
                </p>
              </div>
              <div>
                <p className="text-[#9E968D] font-bold uppercase tracking-wider text-[10px]">Broadcast Completed</p>
                <p className="font-semibold text-[#1E1B18] mt-1">{formatExactDateTime(campaign?.completed_at)}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#1E1B18]">
                <span>End-to-End Broadcast Delivery Funnel</span>
                <span>
                  {reachedDeliveredTotal} Reached ({readSeenTotal} Read, {deliveredNotReadCount} Delivered Unread) •{' '}
                  {sentInTransitCount} In Transit • {failedTotal} Failed
                </span>
              </div>

              <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${(readSeenTotal / (totalRecipients || 1)) * 100}%` }}
                  className="bg-sky-500 h-full transition-all duration-500"
                  title={`Read (Seen): ${readSeenTotal}`}
                />
                <div
                  style={{ width: `${(deliveredNotReadCount / (totalRecipients || 1)) * 100}%` }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title={`Delivered (Unread): ${deliveredNotReadCount}`}
                />
                <div
                  style={{ width: `${(sentInTransitCount / (totalRecipients || 1)) * 100}%` }}
                  className="bg-amber-500 h-full transition-all duration-500"
                  title={`Sent (In Transit): ${sentInTransitCount}`}
                />
                <div
                  style={{ width: `${(failedTotal / (totalRecipients || 1)) * 100}%` }}
                  className="bg-rose-500 h-full transition-all duration-500"
                  title={`Failed: ${failedTotal}`}
                />
              </div>

              <div className="flex flex-wrap gap-5 text-xs font-semibold text-slate-700 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-sky-500" />
                  Read / Seen by Client ({readSeenTotal})
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  Delivered to Phone, Not Opened Yet ({deliveredNotReadCount})
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  Sent to Meta, Awaiting Client Phone Online ({sentInTransitCount})
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  Failed / Not Delivered ({failedTotal})
                </div>
              </div>
            </div>
          </Card>

          {/* 3. Deep Failure Diagnosis & "How to Overcome" Section */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE3CF] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#1E1B18] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Failure Diagnosis: Why Messages Were Not Delivered & How to Overcome
                </h3>
                <p className="text-xs text-[#7C756D] font-medium mt-0.5">
                  Exact root-cause analysis from Meta WhatsApp Cloud API for any message that failed or was blocked, with step-by-step solutions.
                </p>
              </div>

              {failedTotal > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportFailedOnlyExcel}
                    leftIcon={<Download className="w-3.5 h-3.5 text-rose-600" />}
                  >
                    Export Failed Numbers (.xlsx)
                  </Button>
                </div>
              )}
            </div>

            {Object.keys(failureGroups).length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.values(failureGroups).map((group, idx) => {
                  const isSelected = categoryFilter === group.diag.category;
                  return (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border transition-all space-y-3 ${
                        isSelected
                          ? 'bg-rose-50/60 border-rose-400 ring-2 ring-rose-400/20'
                          : 'bg-[#FAF7F2] border-[#EFE3CF]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={group.diag.categoryBadgeVariant} dot>
                              {group.diag.category}
                            </Badge>
                            <span className="text-xs font-mono text-[#7C756D]">Code: {group.diag.code}</span>
                          </div>
                          <h4 className="text-sm font-extrabold text-[#1E1B18]">{group.diag.humanTitle}</h4>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-extrabold">
                            {group.count} {group.count === 1 ? 'Client' : 'Clients'} ({Math.round((group.count / (totalRecipients || 1)) * 100)}%)
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-[#EFE3CF] space-y-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                          Why It Failed (Root Cause):
                        </p>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                          {group.diag.explanation}
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
                          How to Overcome This Issue (Actionable Remedy):
                        </p>
                        <p className="text-xs text-emerald-950 font-semibold leading-relaxed">
                          {group.diag.actionableRemedy}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <div className="text-[11px] text-[#7C756D] font-mono truncate max-w-xs">
                          Affected:{' '}
                          {group.examples.map(e => `${e.name} (${e.phone})`).join(', ')}
                        </div>

                        <button
                          onClick={() => {
                            if (isSelected) {
                              setCategoryFilter(null);
                              setStatusFilter('ALL');
                            } else {
                              setCategoryFilter(group.diag.category);
                              setStatusFilter('FAILED');
                            }
                          }}
                          className="text-xs font-bold text-[#B88B2A] hover:underline cursor-pointer shrink-0"
                        >
                          {isSelected ? 'Clear Filter' : `Show these ${group.count} clients ↓`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-4 text-emerald-900">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-extrabold">Zero Delivery Failures Recorded for This Campaign</p>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    Every recipient in this campaign was accepted by Meta without error. If any recipient is still in &quot;SENT&quot; state, Meta is waiting for their phone to connect to the internet to complete delivery.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* 4. Granular Person-by-Person Recipient Table */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-[#EFE3CF] bg-white space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#1E1B18]">
                    Person-by-Person Recipient Delivery Log ({filteredRecipients.length} of {totalRecipients} Clients)
                  </h3>
                  <p className="text-xs text-[#7C756D] font-medium">
                    Exact Sent, Delivered, and Read timestamps and individual diagnostic details for every single person.
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative w-full lg:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#7C756D]" />
                  <input
                    type="text"
                    placeholder="Search client name, +91 number, or error..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#FAF7F2] border border-[#EFE3CF] rounded-xl text-xs font-medium text-[#1E1B18] outline-none focus:bg-white focus:border-[#DFBE7E]"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'ALL', label: `All Recipients (${totalRecipients})` },
                  { key: 'READ', label: `Read / Seen (${readSeenTotal})` },
                  { key: 'DELIVERED', label: `Reached / Delivered (${reachedDeliveredTotal})` },
                  { key: 'SENT', label: `Sent / In Transit (${sentInTransitCount})` },
                  { key: 'FAILED', label: `Failed / Not Sent (${failedTotal})` },
                  ...(queuedTotal > 0 ? [{ key: 'QUEUED', label: `Queued (${queuedTotal})` }] : [])
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setStatusFilter(tab.key as any);
                      if (tab.key !== 'FAILED') setCategoryFilter(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === tab.key
                        ? 'bg-[#1E1B18] text-[#DFBE7E] shadow-xs'
                        : 'bg-[#FAF7F2] text-[#7C756D] hover:text-[#1E1B18] border border-[#EFE3CF]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

                {categoryFilter && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold">
                    <Filter className="w-3.5 h-3.5" />
                    Filtered by: {categoryFilter}
                    <button
                      onClick={() => setCategoryFilter(null)}
                      className="ml-1 underline hover:text-rose-950 cursor-pointer"
                    >
                      Clear
                    </button>
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#EFE3CF] text-[#9E968D] font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                  <tr>
                    <th className="px-4 py-3.5">#</th>
                    <th className="px-4 py-3.5">Client Name & Number</th>
                    <th className="px-4 py-3.5">Current Status</th>
                    <th className="px-4 py-3.5">Sent Time</th>
                    <th className="px-4 py-3.5">Delivered Time (Reached)</th>
                    <th className="px-4 py-3.5">Read Time (Seen)</th>
                    <th className="px-4 py-3.5">Status Details / Why Not Sent & How to Overcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE3CF] font-medium text-[#3E2D12]">
                  {loading && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#7C756D]">
                        Loading complete person-by-person delivery report...
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    filteredRecipients.map((recip, idx) => {
                      const diag =
                        recip.status === 'FAILED'
                          ? diagnoseMetaError(recip.error_code, recip.error_message)
                          : null;

                      return (
                        <tr key={recip.id} className="hover:bg-[#FAF7F2]/80 transition-colors align-top">
                          <td className="px-4 py-3.5 font-mono text-[#9E968D] whitespace-nowrap">{idx + 1}</td>

                          {/* Client Name & Phone */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="font-bold text-[#1E1B18] text-xs">{recip.contact_name || 'Valued Client'}</p>
                            <p className="font-mono text-[11px] text-[#7C756D] mt-0.5">{recip.phone_number}</p>
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Badge
                              variant={
                                recip.status === 'READ'
                                  ? 'info'
                                  : recip.status === 'DELIVERED'
                                  ? 'success'
                                  : recip.status === 'FAILED'
                                  ? 'danger'
                                  : recip.status === 'SENT'
                                  ? 'primary'
                                  : 'warning'
                              }
                              dot
                            >
                              {recip.status === 'READ'
                                ? 'READ (SEEN)'
                                : recip.status === 'DELIVERED'
                                ? 'DELIVERED'
                                : recip.status === 'SENT'
                                ? 'SENT (IN TRANSIT)'
                                : recip.status === 'FAILED'
                                ? 'FAILED / NOT SENT'
                                : recip.status}
                            </Badge>
                          </td>

                          {/* Sent Timestamp */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px]">
                            {recip.sent_at ? (
                              <span className="text-[#1E1B18] font-semibold">{formatExactDateTime(recip.sent_at)}</span>
                            ) : recip.status === 'FAILED' ? (
                              <span className="text-rose-600 font-semibold">
                                Failed at {formatExactDateTime(recip.failed_at || recip.created_at)}
                              </span>
                            ) : (
                              <span className="text-amber-600">Queued</span>
                            )}
                          </td>

                          {/* Delivered Timestamp */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px]">
                            {recip.delivered_at ? (
                              <span className="text-emerald-700 font-bold">{formatExactDateTime(recip.delivered_at)}</span>
                            ) : recip.status === 'READ' && recip.read_at ? (
                              <span className="text-emerald-700 font-bold">{formatExactDateTime(recip.read_at)}</span>
                            ) : recip.status === 'SENT' ? (
                              <span className="text-amber-700 font-sans text-[11px]">
                                Awaiting client phone online
                              </span>
                            ) : recip.status === 'FAILED' ? (
                              <span className="text-rose-600 font-sans text-[11px] font-semibold">Not Delivered</span>
                            ) : (
                              <span className="text-[#9E968D]">—</span>
                            )}
                          </td>

                          {/* Read / Seen Timestamp */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px]">
                            {recip.read_at ? (
                              <span className="text-sky-700 font-bold">{formatExactDateTime(recip.read_at)}</span>
                            ) : recip.status === 'DELIVERED' ? (
                              <span className="text-[#7C756D] font-sans text-[11px]">Delivered (Not opened yet)</span>
                            ) : recip.status === 'SENT' ? (
                              <span className="text-[#9E968D] font-sans text-[11px]">Not delivered yet</span>
                            ) : (
                              <span className="text-[#9E968D]">—</span>
                            )}
                          </td>

                          {/* Detailed Status / Failure Diagnosis & Remedy */}
                          <td className="px-4 py-3.5 min-w-[340px] max-w-xl">
                            {diag ? (
                              <div className="space-y-1">
                                <div className="text-rose-700 font-bold text-xs flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>
                                    [{diag.code}] {diag.humanTitle}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-snug">{diag.explanation}</p>
                                <p className="text-[11px] text-emerald-800 font-semibold leading-snug bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                  <strong>How to overcome:</strong> {diag.actionableRemedy}
                                </p>
                              </div>
                            ) : recip.status === 'READ' ? (
                              <div className="space-y-0.5">
                                <span className="text-sky-700 font-bold flex items-center gap-1.5">
                                  <CheckCheck className="w-4 h-4" /> Message Delivered & Opened by Client
                                </span>
                                <p className="text-[10px] font-mono text-[#9E968D]">
                                  Meta ID: {recip.meta_message_id || 'Verified'}
                                </p>
                              </div>
                            ) : recip.status === 'DELIVERED' ? (
                              <div className="space-y-0.5">
                                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                  <Check className="w-4 h-4" /> Reached Client&apos;s WhatsApp Phone
                                </span>
                                <p className="text-[11px] text-[#7C756D]">
                                  Notification is on the client&apos;s phone; Read Time will update as soon as they open the chat (if Read Receipts are enabled).
                                </p>
                              </div>
                            ) : recip.status === 'SENT' ? (
                              <div className="space-y-0.5">
                                <span className="text-indigo-700 font-bold flex items-center gap-1.5">
                                  <Send className="w-3.5 h-3.5" /> Sent to Meta WhatsApp Cloud
                                </span>
                                <p className="text-[11px] text-[#7C756D]">
                                  Dispatched by Meta servers; waiting for the client&apos;s mobile data/Wi-Fi to come online to deliver to handset.
                                </p>
                              </div>
                            ) : (
                              <span className="text-amber-700 font-semibold">Queued for worker dispatch</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  {!loading && filteredRecipients.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-xs text-[#7C756D]">
                        No recipients match the selected filter or search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
