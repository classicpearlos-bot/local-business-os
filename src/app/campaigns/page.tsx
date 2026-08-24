'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { 
  Search, 
  Plus, 
  Megaphone, 
  Play, 
  Clock, 
  Pause, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Calendar,
  Users,
  Check,
  Image as ImageIcon,
  Video,
  FileText,
  Send,
  Eye,
  Terminal,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  SlidersHorizontal,
  Info,
  Bug,
  FileSpreadsheet,
  BarChart3,
  PieChart,
  Download,
  AlertTriangle,
  HelpCircle,
  PhoneCall,
  CheckCheck
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaUploader, MediaUploadValue } from "@/components/ui/MediaUploader";
import { ExcelUploader } from "@/components/ui/ExcelUploader";
import { WhatsAppPreview } from "@/components/ui/WhatsAppPreview";
import { buildTemplateComponents, TemplateMediaHeader } from "@/lib/meta/whatsapp";
import { diagnoseMetaError, ErrorDiagnosis } from "@/lib/meta/errorDiagnosis";
import { ExcelParseResult } from "@/utils/excelImport";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderStep, setBuilderStep] = useState<number>(1);
  const [contactCount, setContactCount] = useState<number>(0);
  const [excludedCount, setExcludedCount] = useState<number>(0);

  // Audience Source Selection (CRM vs Excel/CSV vs Manual)
  const [audienceSource, setAudienceSource] = useState<'crm' | 'excel' | 'manual'>('crm');
  const [parsedExcel, setParsedExcel] = useState<ExcelParseResult | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [manualNumbers, setManualNumbers] = useState('');

  // Campaign Builder Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedTemplateId: '',
    templateName: '',
    templateLanguage: 'en_US',
    headerType: 'none' as 'none' | 'text' | 'image' | 'video' | 'document',
    mediaHeader: null as MediaUploadValue | null,
    variables: {} as Record<string, string>,
    scheduledAt: '',
  });

  // Test Send State
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ success?: boolean; msg?: string; error?: string } | null>(null);

  // Confirmation state
  const [confirmInput, setConfirmInput] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Comprehensive Campaign Analytics & Debugger Report State
  const [reportCampaign, setReportCampaign] = useState<any | null>(null);
  const [reportRecipients, setReportRecipients] = useState<any[]>([]);
  const [reportTab, setReportTab] = useState<'overview' | 'failures' | 'log'>('overview');
  const [reportLoading, setReportLoading] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientFilter, setRecipientFilter] = useState<'ALL' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'>('ALL');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setCampaigns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/templates/local');
      const json = await res.json();
      if (res.ok && json.data) {
        setTemplates(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();

    // Fetch CRM audience counts
    Promise.all([
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('opted_in', true),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('opted_in', false)
    ]).then(([{ count: optIn }, { count: optOut }]) => {
      setContactCount(optIn || 0);
      setExcludedCount(optOut || 0);
    });

    const channel = supabase
      .channel('campaigns-live-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => {
        fetchCampaigns();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCampaigns, fetchTemplates]);

  // Handle Template Selection & detect required media & variables
  const handleSelectTemplate = (template: any) => {
    const components = template.components as any[] || [];
    const headerComp = components.find(c => c.type === 'HEADER');
    const bodyComp = components.find(c => c.type === 'BODY');

    let detectedHeaderType: 'none' | 'text' | 'image' | 'video' | 'document' = 'none';
    if (headerComp) {
      const format = (headerComp.format || '').toLowerCase();
      if (['image', 'video', 'document', 'text'].includes(format)) {
        detectedHeaderType = format as any;
      }
    }

    // Detect variables count in body, e.g. {{1}}, {{2}}
    const bodyText = bodyComp?.text || '';
    const variableMatches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const initialVariables: Record<string, string> = {};
    variableMatches.forEach((m: string) => {
      const num = m.replace(/\D/g, '');
      initialVariables[num] = '';
    });

    setFormData(prev => ({
      ...prev,
      selectedTemplateId: template.id,
      templateName: template.name,
      templateLanguage: template.language || 'en_US',
      headerType: detectedHeaderType,
      mediaHeader: null,
      variables: initialVariables
    }));
  };

  const selectedTemplateObj = templates.find(t => t.id === formData.selectedTemplateId);

  const getTemplateBodyText = () => {
    if (!selectedTemplateObj) return 'Select a template to preview message content.';
    const components = selectedTemplateObj.components as any[] || [];
    const bodyComp = components.find(c => c.type === 'BODY');
    return bodyComp?.text || '';
  };

  const getTemplateFooterText = () => {
    if (!selectedTemplateObj) return undefined;
    const components = selectedTemplateObj.components as any[] || [];
    const footerComp = components.find(c => c.type === 'FOOTER');
    return footerComp?.text;
  };

  const getTemplateButtons = () => {
    if (!selectedTemplateObj) return [];
    const components = selectedTemplateObj.components as any[] || [];
    const buttonsComp = components.find(c => c.type === 'BUTTONS');
    return buttonsComp?.buttons || [];
  };

  // Compile final Meta-compliant template_components
  const getCompiledComponents = () => {
    let mediaHeaderParam: TemplateMediaHeader | undefined = undefined;
    if (formData.headerType !== 'none' && formData.headerType !== 'text' && formData.mediaHeader) {
      mediaHeaderParam = {
        type: formData.headerType,
        url: formData.mediaHeader.url,
        id: formData.mediaHeader.media_id,
        filename: formData.mediaHeader.filename
      };
    }

    const varValues = Object.keys(formData.variables).sort().map(k => formData.variables[k]);
    return buildTemplateComponents(mediaHeaderParam, varValues);
  };

  // Handle Live Test Send
  const handleTestSend = async () => {
    if (!testPhone) {
      setTestSendResult({ error: 'Please enter a test WhatsApp phone number.' });
      return;
    }

    setTestSending(true);
    setTestSendResult(null);

    try {
      const res = await fetch('/api/whatsapp/campaigns/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_phone: testPhone,
          template_name: formData.templateName,
          template_language: formData.templateLanguage,
          template_components: getCompiledComponents()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setTestSendResult({ error: data.error || 'Meta test send failed.' });
      } else {
        setTestSendResult({ 
          success: true, 
          msg: `Delivered test WhatsApp message to ${data.recipient}! (Meta ID: ${data.meta_message_id})` 
        });
      }
    } catch (err: any) {
      setTestSendResult({ error: err.message || 'Network error calling test send.' });
    } finally {
      setTestSending(false);
    }
  };

  const getManualNumbersList = () => {
    return manualNumbers
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 5);
  };

  // Launch Full Campaign (Handles CRM, Excel, and Manual)
  const handleLaunchCampaign = async () => {
    const manualList = getManualNumbersList();
    const effectiveRecipientCount = 
      audienceSource === 'excel' ? (parsedExcel?.validContacts.length || 0) :
      audienceSource === 'manual' ? manualList.length :
      contactCount;

    if (effectiveRecipientCount === 0) {
      setFormError('Cannot launch broadcast: 0 valid recipients found.');
      return;
    }

    if (confirmInput.trim().toUpperCase() !== 'SEND') {
      setFormError('Please type "SEND" to confirm broadcast execution.');
      return;
    }

    setFormSaving(true);
    setFormError('');

    try {
      let contactIds: string[] = [];

      if (audienceSource === 'excel' && parsedExcel) {
        // Bulk import Excel contacts to organization contacts table
        const importRes = await fetch('/api/contacts/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contacts: parsedExcel.validContacts.map(c => ({
              name: c.name,
              phone_number: c.normalizedPhone,
              opted_in: true
            }))
          })
        });

        const importData = await importRes.json();
        if (!importRes.ok) {
          throw new Error(importData.error || 'Failed to import Excel contacts');
        }

        contactIds = (importData.contacts || []).map((c: any) => c.id);
      } else if (audienceSource === 'manual' && manualList.length > 0) {
        // Bulk import Manual contacts
        const importRes = await fetch('/api/contacts/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contacts: manualList.map(phone => {
              // naive normalization (add + if missing, strip spaces)
              let clean = phone.replace(/[^0-9+]/g, '');
              if (!clean.startsWith('+')) clean = '+' + clean;
              return {
                name: 'Manual Contact',
                phone_number: clean,
                opted_in: true
              };
            })
          })
        });

        const importData = await importRes.json();
        if (!importRes.ok) {
          throw new Error(importData.error || 'Failed to import Manual contacts');
        }

        contactIds = (importData.contacts || []).map((c: any) => c.id);
      } else {
        // Fetch all opted-in CRM contacts
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id')
          .eq('opted_in', true);

        contactIds = (contacts || []).map(c => c.id);
      }

      const res = await fetch('/api/whatsapp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          template_name: formData.templateName,
          template_language: formData.templateLanguage,
          template_components: getCompiledComponents(),
          scheduled_at: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
          contact_ids: contactIds
        })
      });

      const result = await res.json();
      if (!res.ok) {
        setFormError(result.error || 'Failed to create campaign');
        return;
      }

      setShowBuilder(false);
      setBuilderStep(1);
      setParsedExcel(null);
      setExcelFile(null);
      setFormData({
        name: '',
        description: '',
        selectedTemplateId: '',
        templateName: '',
        templateLanguage: 'en_US',
        headerType: 'none',
        mediaHeader: null,
        variables: {},
        scheduledAt: ''
      });
      fetchCampaigns();
    } catch (err: any) {
      setFormError(err.message || 'Network error creating campaign.');
    } finally {
      setFormSaving(false);
    }
  };

  // Open Full Campaign Report & Diagnostics Studio
  const openReport = async (campaign: any) => {
    setReportCampaign(campaign);
    setReportTab('overview');
    setReportLoading(true);
    setRecipientSearch('');
    setRecipientFilter('ALL');

    try {
      const res = await fetch(`/api/whatsapp/campaigns/${campaign.id}/recipients`);
      if (res.ok) {
        const data = await res.json();
        setReportRecipients(data.recipients || []);
      }
    } finally {
      setReportLoading(false);
    }
  };

  // Export Failed Recipients to CSV
  const exportFailedRecipients = () => {
    if (!reportCampaign) return;
    const failedList = reportRecipients
      .filter(r => r.status === 'FAILED')
      .map(r => {
        const diag = diagnoseMetaError(r.error_code, r.error_message);
        return {
          'Phone Number': r.phone_number,
          'Meta Message ID': r.meta_message_id || 'N/A',
          'Failure Category': diag.category,
          'Error Reason': diag.humanTitle,
          'Recommended Remedy': diag.actionableRemedy,
          'Meta Error Code': r.error_code || 'N/A'
        };
      });

    if (failedList.length === 0) {
      alert('No failed recipients in this campaign to export!');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(failedList);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Failed_Numbers');
    XLSX.writeFile(wb, `${reportCampaign.name.replace(/\s+/g, '_')}_failed_report.xlsx`);
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.template_name?.toLowerCase().includes(search.toLowerCase())
  );

  const total = campaigns.length;
  const queued = campaigns.filter(c => c.status === 'QUEUED' || c.status === 'SCHEDULED').length;
  const processing = campaigns.filter(c => c.status === 'PROCESSING').length;
  const completed = campaigns.filter(c => c.status === 'COMPLETED').length;

  // Report Metrics Calculations
  const reportTotal = reportRecipients.length;
  const reportSent = reportRecipients.filter(r => ['SENT', 'DELIVERED', 'READ'].includes(r.status)).length;
  const reportDelivered = reportRecipients.filter(r => ['DELIVERED', 'READ'].includes(r.status)).length;
  const reportRead = reportRecipients.filter(r => r.status === 'READ').length;
  const reportFailed = reportRecipients.filter(r => r.status === 'FAILED').length;

  const sentPct = reportTotal > 0 ? Math.round((reportSent / reportTotal) * 100) : 0;
  const deliveredPct = reportSent > 0 ? Math.round((reportDelivered / reportSent) * 100) : 0;
  const readPct = reportDelivered > 0 ? Math.round((reportRead / reportDelivered) * 100) : 0;
  const failedPct = reportTotal > 0 ? Math.round((reportFailed / reportTotal) * 100) : 0;

  // Group Failed Recipients by Diagnosis Category
  const failureGroups: Record<string, { count: number; diag: ErrorDiagnosis; examples: string[] }> = {};
  reportRecipients.filter(r => r.status === 'FAILED').forEach(r => {
    const diag = diagnoseMetaError(r.error_code, r.error_message);
    if (!failureGroups[diag.category]) {
      failureGroups[diag.category] = { count: 0, diag, examples: [] };
    }
    failureGroups[diag.category].count++;
    if (failureGroups[diag.category].examples.length < 3) {
      failureGroups[diag.category].examples.push(r.phone_number);
    }
  });

  const filteredReportRecipients = reportRecipients.filter(r => {
    if (recipientFilter !== 'ALL' && r.status !== recipientFilter) return false;
    if (recipientSearch) {
      const q = recipientSearch.toLowerCase();
      const phone = r.phone_number?.toLowerCase() || '';
      const wamid = r.meta_message_id?.toLowerCase() || '';
      return phone.includes(q) || wamid.includes(q);
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Broadcast Campaigns"
          subtitle="Enterprise broadcast studio with Excel/CSV audience import, Image/Video headers, and granular delivery & failure reporting."
          badge={<Badge variant="primary">{total} Broadcasts</Badge>}
          actions={
            <Button
              onClick={() => {
                setFormError('');
                setBuilderStep(1);
                setAudienceSource('crm');
                setParsedExcel(null);
                setShowBuilder(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Media Broadcast
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-6">
          {/* KPI Analytics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Campaigns"
              value={total}
              subtitle="All broadcasts"
              icon={Megaphone}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-50 border-indigo-100"
            />
            <StatCard
              title="PostgreSQL Queue"
              value={queued}
              subtitle="Ready for worker claims"
              icon={Clock}
              iconColor="text-amber-600"
              iconBg="bg-amber-50 border-amber-100"
            />
            <StatCard
              title="Active Processing"
              value={processing}
              subtitle="Worker concurrency active"
              icon={Play}
              iconColor="text-sky-600"
              iconBg="bg-sky-50 border-sky-100"
            />
            <StatCard
              title="Completed Blasts"
              value={completed}
              subtitle="100% Delivered"
              icon={CheckCircle2}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50 border-emerald-100"
            />
          </div>

          <Card className="overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-white">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search campaigns or templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                />
              </div>

              <Button variant="outline" size="sm" onClick={fetchCampaigns} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>
                Refresh
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Campaign Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Template</th>
                    <th className="px-6 py-4">Schedule / Created</th>
                    <th className="px-6 py-4">Delivery Rate</th>
                    <th className="px-6 py-4 text-right">Analytics & Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {filteredCampaigns.map((campaign) => {
                    const percent = Math.min(100, Math.round(((campaign.total_sent || 0) / (campaign.total_recipients || 1)) * 100));

                    return (
                      <tr key={campaign.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-slate-900 font-bold text-sm">
                          {campaign.name}
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={campaign.status === 'COMPLETED' ? 'success' : campaign.status === 'PROCESSING' ? 'primary' : campaign.status === 'FAILED' ? 'danger' : 'warning'} 
                            dot
                          >
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-700">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                            {campaign.template_name || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(campaign.scheduled_at || campaign.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-28 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-500">
                              {percent === 100 ? '100% completed' : `${campaign.total_sent || 0} sent`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReport(campaign)}
                            leftIcon={<BarChart3 className="w-3.5 h-3.5 text-indigo-600" />}
                          >
                            View Full Report
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCampaigns.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          icon={Megaphone}
                          title="No broadcast campaigns created"
                          description="Launch your first high-converting media campaign to engage with your audience."
                          actionLabel="Create Broadcast"
                          onAction={() => { setFormError(''); setBuilderStep(1); setShowBuilder(true); }}
                          actionIcon={<Plus className="w-4 h-4" />}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>

      {/* Multi-Step World-Class Campaign Builder Studio */}
      <Modal
        isOpen={showBuilder}
        onClose={() => setShowBuilder(false)}
        size="xl"
        title="WhatsApp Campaign Studio"
        description={`Step ${builderStep} of 4: ${
          builderStep === 1 ? 'Choose Audience Source (CRM or Excel Upload)' :
          builderStep === 2 ? 'Select Meta Approved Template' :
          builderStep === 3 ? 'Media Header & Variables Studio' :
          'Pre-Flight Validation & Test Send'
        }`}
      >
        <div className="space-y-6">
          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          {/* STEP 1: Campaign Details & Audience Source (CRM vs Excel) */}
          {builderStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <Input
                label="Campaign Name *"
                placeholder="e.g. Diwali Mega Festival Flash Sale 2026"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Input
                label="Campaign Description / Internal Tag"
                placeholder="Marketing blast targeted at customer list"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              {/* Audience Source Selector Tabs */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Audience Source *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    onClick={() => setAudienceSource('crm')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      audienceSource === 'crm'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Users className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">CRM Contacts</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{contactCount} opted-in</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setAudienceSource('excel')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      audienceSource === 'excel'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Upload Excel</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Import directly</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setAudienceSource('manual')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      audienceSource === 'manual'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Terminal className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Manual Numbers</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Comma separated</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditional Audience Box */}
              {audienceSource === 'crm' ? (
                /* CRM Audience Summary Card */
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">CRM Audience Calculation</h4>
                    </div>
                    <Badge variant="success" dot>{contactCount} Valid Contacts</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <p className="text-slate-400 font-medium">Eligible Opted-In</p>
                      <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{contactCount}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <p className="text-slate-400 font-medium">Suppressed (Opted Out)</p>
                      <p className="text-xl font-extrabold text-slate-400 mt-0.5">{excludedCount}</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Contacts with opt-out status are automatically excluded from the queue to protect your Meta quality rating.
                  </p>
                </div>
              ) : audienceSource === 'excel' ? (
                /* Excel / CSV Uploader & Parsing Component */
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Upload Client Spreadsheet</h4>
                    </div>
                    {parsedExcel && (
                      <Badge variant="success" dot>{parsedExcel.validContacts.length} Numbers Ready</Badge>
                    )}
                  </div>

                  <ExcelUploader
                    parsedResult={parsedExcel}
                    onParsed={(res, file) => {
                      setParsedExcel(res);
                      setExcelFile(file);
                    }}
                    onClear={() => {
                      setParsedExcel(null);
                      setExcelFile(null);
                    }}
                  />
                </div>
              ) : (
                /* Manual Numbers Input Component */
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Manual Numbers</h4>
                    </div>
                    {manualNumbers.length > 0 && (
                      <Badge variant="success" dot>{manualNumbers.split(',').filter(n => n.trim().length > 5).length} Numbers Ready</Badge>
                    )}
                  </div>

                  <Textarea
                    label="Enter Phone Numbers (comma separated)"
                    placeholder="e.g. +917483654138, 9876543210, +1234567890"
                    value={manualNumbers}
                    onChange={(e) => setManualNumbers(e.target.value)}
                    rows={4}
                    helperText="Ensure country codes are included for best deliverability."
                  />
                </div>
              )}

              <Input
                label="Schedule Broadcast (Optional)"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                helperText="Leave empty to queue for immediate delivery."
              />
            </div>
          )}

          {/* STEP 2: Template Selection */}
          {builderStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="text-xs text-slate-500 font-medium">
                Choose a pre-approved template from your Meta Business Account:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                {templates.map((tpl) => {
                  const isSelected = formData.selectedTemplateId === tpl.id;
                  const comps = tpl.components as any[] || [];
                  const header = comps.find(c => c.type === 'HEADER');
                  const headerFormat = (header?.format || 'TEXT').toUpperCase();

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 relative ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-slate-900 truncate max-w-[180px]">
                          {tpl.name}
                        </span>
                        <Badge variant={tpl.status === 'APPROVED' ? 'success' : 'warning'}>
                          {tpl.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <span className="bg-slate-100 px-2 py-0.5 rounded uppercase font-bold text-indigo-700">
                          {headerFormat} Header
                        </span>
                        <span>{tpl.language}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Media & Dynamic Variables Studio with Live WhatsApp Preview */}
          {builderStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-150">
              {/* Left Column: Media Uploader & Variable Inputs */}
              <div className="space-y-5">
                {/* Media Uploader if template requires image, video, or document */}
                {formData.headerType !== 'none' && formData.headerType !== 'text' ? (
                  <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Template Requires {formData.headerType.toUpperCase()} Header
                    </div>
                    <MediaUploader
                      mediaType={formData.headerType as any}
                      value={formData.mediaHeader}
                      onChange={(val) => setFormData(prev => ({ ...prev, mediaHeader: val }))}
                      required={true}
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400 shrink-0" />
                    This template uses a standard text header. No media attachment required.
                  </div>
                )}

                {/* Variable Interpolation Inputs */}
                {Object.keys(formData.variables).length > 0 && (
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Template Variables
                    </h4>
                    <div className="space-y-2.5">
                      {Object.keys(formData.variables).sort().map((varKey) => (
                        <Input
                          key={varKey}
                          label={`Variable {{${varKey}}} Sample / Default`}
                          placeholder={`Value for {{${varKey}}}`}
                          value={formData.variables[varKey]}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              variables: { ...prev.variables, [varKey]: val }
                            }));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Live WhatsApp Interactive Preview */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-100/60 rounded-2xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Live Customer Preview
                </p>
                <WhatsAppPreview
                  headerType={formData.headerType}
                  headerContent={formData.mediaHeader?.url}
                  headerFilename={formData.mediaHeader?.filename}
                  bodyText={getTemplateBodyText()}
                  footerText={getTemplateFooterText()}
                  variables={formData.variables}
                  buttons={getTemplateButtons()}
                  status="read"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Pre-Flight Checklist & Live Test Send */}
          {builderStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Pre-flight Checklist */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                  Pre-Flight Verification Checklist
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Campaign Name Defined
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {audienceSource === 'excel' ? (parsedExcel?.validContacts.length || 0) : contactCount} Target Recipients
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Meta Template Approved
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.headerType === 'none' || formData.headerType === 'text' || formData.mediaHeader ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                    Media Header Attached
                  </div>
                </div>
              </div>

              {/* Instant Test Send Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <Send className="w-4 h-4 text-indigo-600" />
                  Dispatch Test WhatsApp Message to Your Phone
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Verify how the exact template and media appear on an actual WhatsApp client before broadcasting.
                </p>

                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="+919876543210 (include country code)"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={testSending}
                    onClick={handleTestSend}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Send Test
                  </Button>
                </div>

                {testSendResult && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    testSendResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {testSendResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <p>{testSendResult.msg || testSendResult.error}</p>
                  </div>
                )}
              </div>

              {/* Confirmation Guard */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Launch Confirmation</span>
                  <Badge variant="warning">
                    {audienceSource === 'excel' ? (parsedExcel?.validContacts.length || 0) : contactCount} Recipients
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Type <strong className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">SEND</strong> below to authorize queueing this campaign for delivery:
                </p>
                <input
                  type="text"
                  placeholder="Type SEND to confirm"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:ring-2 focus:ring-indigo-500/40 outline-none uppercase"
                />
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            {builderStep > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBuilderStep(prev => prev - 1)}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowBuilder(false)}>
                Cancel
              </Button>
            )}

            {builderStep < 4 ? (
              <Button
                size="sm"
                onClick={() => {
                  if (builderStep === 1) {
                    if (!formData.name.trim()) {
                      setFormError('Please provide a campaign name.');
                      return;
                    }
                    if (audienceSource === 'excel' && (!parsedExcel || parsedExcel.validContacts.length === 0)) {
                      setFormError('Please upload a valid Excel or CSV spreadsheet with phone numbers.');
                      return;
                    }
                    if (audienceSource === 'crm' && contactCount === 0) {
                      setFormError('0 CRM contacts available. Upload an Excel file or add contacts to continue.');
                      return;
                    }
                    if (audienceSource === 'manual') {
                      const manualValidCount = manualNumbers.split(',').filter(n => n.trim().length > 5).length;
                      if (manualValidCount === 0) {
                        setFormError('Please enter at least one valid manual phone number.');
                        return;
                      }
                    }
                  }
                  if (builderStep === 2 && !formData.selectedTemplateId) {
                    setFormError('Please select a Meta approved template.');
                    return;
                  }
                  setFormError('');
                  setBuilderStep(prev => prev + 1);
                }}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Next Step
              </Button>
            ) : (
              <Button
                variant="whatsapp"
                size="sm"
                isLoading={formSaving}
                onClick={handleLaunchCampaign}
                leftIcon={<Megaphone className="w-4 h-4" />}
              >
                Execute Broadcast
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Full Campaign Analytics & Failure Diagnosis Report Modal */}
      {reportCampaign && (
        <Modal
          isOpen={!!reportCampaign}
          onClose={() => setReportCampaign(null)}
          size="xl"
          title={`Campaign Report: ${reportCampaign.name}`}
          description={`Comprehensive delivery statistics, percentage KPIs, and failure diagnosis.`}
        >
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setReportTab('overview')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  reportTab === 'overview' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Delivery KPIs & Funnel ({sentPct}%)
              </button>

              <button
                onClick={() => setReportTab('failures')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  reportTab === 'failures' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Failure Diagnosis ({reportFailed})
              </button>

              <button
                onClick={() => setReportTab('log')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  reportTab === 'log' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users className="w-4 h-4" />
                Client Traces ({reportTotal})
              </button>
            </div>

            {/* TAB 1: Delivery KPIs & Funnel Percentages */}
            {reportTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* 4 KPI Percentage Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Sent to Meta</p>
                    <p className="text-2xl font-extrabold text-indigo-900 mt-1">{sentPct}%</p>
                    <p className="text-xs text-indigo-700 font-medium mt-0.5">{reportSent} of {reportTotal} clients</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Delivered / Reached</p>
                    <p className="text-2xl font-extrabold text-emerald-900 mt-1">{deliveredPct}%</p>
                    <p className="text-xs text-emerald-700 font-medium mt-0.5">{reportDelivered} devices received</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Read / Opened</p>
                    <p className="text-2xl font-extrabold text-sky-900 mt-1">{readPct}%</p>
                    <p className="text-xs text-sky-700 font-medium mt-0.5">{reportRead} clients read offer</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Failed / Undelivered</p>
                    <p className="text-2xl font-extrabold text-rose-900 mt-1">{failedPct}%</p>
                    <p className="text-xs text-rose-700 font-medium mt-0.5">{reportFailed} numbers failed</p>
                  </div>
                </div>

                {/* Visual Segmented Progress Distribution Bar */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Message Lifecycle Funnel</span>
                    <span>{reportTotal} Total Recipients</span>
                  </div>

                  <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    <div style={{ width: `${(reportRead / (reportTotal || 1)) * 100}%` }} className="bg-sky-500 h-full" title={`Read: ${reportRead}`} />
                    <div style={{ width: `${((reportDelivered - reportRead) / (reportTotal || 1)) * 100}%` }} className="bg-emerald-500 h-full" title={`Delivered: ${reportDelivered - reportRead}`} />
                    <div style={{ width: `${((reportSent - reportDelivered) / (reportTotal || 1)) * 100}%` }} className="bg-indigo-500 h-full" title={`Sent: ${reportSent - reportDelivered}`} />
                    <div style={{ width: `${(reportFailed / (reportTotal || 1)) * 100}%` }} className="bg-rose-500 h-full" title={`Failed: ${reportFailed}`} />
                  </div>

                  <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-500" /> Read ({reportRead})</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Delivered ({reportDelivered - reportRead})</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500" /> In Transit ({reportSent - reportDelivered})</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500" /> Failed ({reportFailed})</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Why Messages Failed? (Diagnosis Breakdown) */}
            {reportTab === 'failures' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Failure Reasons & Remediation</h4>
                    <p className="text-xs text-slate-500 font-medium">Automatic diagnosis of why undelivered messages failed to reach customers.</p>
                  </div>

                  {reportFailed > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportFailedRecipients}
                      leftIcon={<Download className="w-3.5 h-3.5 text-indigo-600" />}
                    >
                      Export Failed List (.xlsx)
                    </Button>
                  )}
                </div>

                {Object.keys(failureGroups).length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {Object.values(failureGroups).map((group, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={group.diag.categoryBadgeVariant} dot>
                              {group.diag.category}
                            </Badge>
                            <span className="font-bold text-slate-900 text-xs">{group.diag.humanTitle}</span>
                          </div>
                          <span className="text-xs font-extrabold text-rose-600">
                            {group.count} clients affected ({Math.round((group.count / (reportFailed || 1)) * 100)}%)
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          {group.diag.explanation}
                        </p>

                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2 text-xs">
                          <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="text-slate-700">
                            <strong>Recommended Action:</strong> {group.diag.actionableRemedy}
                          </div>
                        </div>

                        {group.examples.length > 0 && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            Sample numbers: {group.examples.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm font-bold">Zero Failures Encountered!</p>
                    <p className="text-xs text-emerald-600 mt-1">100% of dispatched messages were successfully processed by Meta WhatsApp servers.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Granular Client Traces Log */}
            {reportTab === 'log' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Search & Status Filters */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by phone number or Meta ID..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    {(['ALL', 'READ', 'DELIVERED', 'SENT', 'FAILED'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setRecipientFilter(st)}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          recipientFilter === st ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Trace Table */}
                <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Recipient</th>
                        <th className="px-4 py-3">Delivery Status</th>
                        <th className="px-4 py-3">Meta Message ID</th>
                        <th className="px-4 py-3">Diagnosis / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredReportRecipients.map((recip) => {
                        const diag = recip.status === 'FAILED' ? diagnoseMetaError(recip.error_code, recip.error_message) : null;

                        return (
                          <tr key={recip.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-mono">{recip.phone_number}</td>
                            <td className="px-4 py-3">
                              <Badge 
                                variant={recip.status === 'READ' ? 'success' : recip.status === 'DELIVERED' ? 'info' : recip.status === 'FAILED' ? 'danger' : 'primary'} 
                                dot
                              >
                                {recip.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                              {recip.meta_message_id || 'In Queue'}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {diag ? (
                                <span className="text-rose-600 font-semibold">{diag.category}: {diag.humanTitle}</span>
                              ) : recip.status === 'READ' ? (
                                <span className="text-sky-600 font-semibold flex items-center gap-1">
                                  <CheckCheck className="w-3.5 h-3.5" /> Read by client
                                </span>
                              ) : recip.status === 'DELIVERED' ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Delivered to handset
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredReportRecipients.length === 0 && !reportLoading && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                            No recipient traces matching criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setReportCampaign(null)}>
                Close Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
