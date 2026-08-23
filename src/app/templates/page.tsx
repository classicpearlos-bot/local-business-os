'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { 
  Search, 
  RefreshCw, 
  FileText, 
  MessageSquareDashed, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  CheckCheck,
  Check,
  ExternalLink,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { WhatsAppPreview } from "@/components/ui/WhatsAppPreview";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('message_templates')
        .select('*')
        .order('name', { ascending: true });

      if (data) setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSyncFromMeta = async () => {
    setSyncing(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/whatsapp/templates');
      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: 'Failed to parse response from server' };
      }

      if (!res.ok) {
        setStatusMsg({ 
          type: 'error', 
          text: data.error || 'Failed to sync templates. Please verify your WhatsApp Business Account is connected in Meta Connection settings.' 
        });
        return;
      }

      setStatusMsg({ 
        type: 'success', 
        text: `Successfully synced ${data.data?.length || 0} template(s) directly from your Meta WhatsApp Business Account!` 
      });
      fetchTemplates();
    } catch (err: any) {
      setStatusMsg({ 
        type: 'error', 
        text: 'Network error connecting to template sync endpoint. Please verify server connectivity.' 
      });
    } finally {
      setSyncing(false);
    }
  };

  const getTemplateBodyText = (template: any) => {
    const components = template.components as any[] || [];
    const bodyComp = components.find(c => c.type === 'BODY');
    return bodyComp?.text || 'Template message content.';
  };

  const getTemplateHeaderInfo = (template: any) => {
    const components = template.components as any[] || [];
    const headerComp = components.find(c => c.type === 'HEADER');
    if (!headerComp) return { type: 'none', format: 'TEXT' };
    return {
      type: (headerComp.format || 'TEXT').toLowerCase(),
      format: (headerComp.format || 'TEXT').toUpperCase()
    };
  };

  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Message Templates"
          subtitle="Pre-approved WhatsApp business templates synchronized directly from your Meta Business Manager."
          badge={<Badge variant="primary">{templates.length} Templates</Badge>}
          actions={
            <Button
              onClick={handleSyncFromMeta}
              isLoading={syncing}
              variant="whatsapp"
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Sync from Meta
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-6">
          {/* Informational Banner on What Templates Are */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-xs text-indigo-950">
                <p className="font-bold text-sm">Why are Message Templates required?</p>
                <p className="text-slate-600 font-medium mt-0.5 leading-relaxed">
                  WhatsApp rules require businesses to use <strong>pre-approved Meta templates</strong> whenever sending marketing offers, broadcasts, or reaching out to customers first.
                </p>
              </div>
            </div>

            <Link href="/whatsapp" className="shrink-0">
              <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Meta Connection Settings
              </Button>
            </Link>
          </div>

          {statusMsg && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs font-semibold ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p>{statusMsg.text}</p>
                {statusMsg.type === 'error' && (
                  <p className="text-[11px] font-normal text-rose-600 mt-1">
                    Tip: Make sure you have entered your <strong>WABA ID</strong> and <strong>Access Token</strong> in <Link href="/whatsapp" className="underline font-bold">Meta Connection</Link> settings.
                  </p>
                )}
              </div>
            </div>
          )}

          <Card className="overflow-hidden">
            {/* Toolbar */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-white">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search template name or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                />
              </div>

              <Button variant="outline" size="sm" onClick={fetchTemplates} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>
                Refresh
              </Button>
            </div>

            {/* Templates Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Template Name</th>
                    <th className="px-6 py-4">Header Format</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Language</th>
                    <th className="px-6 py-4">Meta Status</th>
                    <th className="px-6 py-4 text-right">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {filteredTemplates.map((template) => {
                    const headerInfo = getTemplateHeaderInfo(template);

                    return (
                      <tr key={template.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">
                          {template.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            {headerInfo.format}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                          {template.category}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-700">
                          {template.language}
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={template.status === 'APPROVED' ? 'success' : template.status === 'REJECTED' ? 'danger' : 'warning'} 
                            dot
                          >
                            {template.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTemplate(template)}
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Preview
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTemplates.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          icon={FileText}
                          title="No message templates found"
                          description="Connect your Meta WhatsApp Account and click 'Sync from Meta' to fetch all your approved marketing & offer templates."
                          actionLabel="Sync from Meta"
                          onAction={handleSyncFromMeta}
                          actionIcon={<RefreshCw className="w-4 h-4" />}
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

      {/* WhatsApp Template Preview Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          title={`Template: ${selectedTemplate.name}`}
          description={`Category: ${selectedTemplate.category} | Language: ${selectedTemplate.language} | Status: ${selectedTemplate.status}`}
        >
          <div className="flex justify-center py-4">
            <WhatsAppPreview
              headerType={getTemplateHeaderInfo(selectedTemplate).type as any}
              bodyText={getTemplateBodyText(selectedTemplate)}
              footerText="Reply STOP to unsubscribe"
              status="read"
            />
          </div>
          <div className="pt-4 flex justify-end border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
