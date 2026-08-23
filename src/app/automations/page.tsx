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
  ArrowRight, 
  Clock, 
  Sliders,
  AlertCircle,
  Check
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchAutomations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('automations')
        .select('*')
        .order('priority', { ascending: false });

      if (data) setAutomations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

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

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Keyword Automations & Auto-Replies"
          subtitle="Configure instant automated chatbots, keyword auto-replies, and cooldown safeguards."
          badge={<Badge variant="primary">{automations.length} Rules</Badge>}
          actions={
            <Button onClick={() => { setFormError(''); setShowModal(true); }} leftIcon={<Plus className="w-4 h-4" />}>
              New Automation
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-6">
          <Card className="overflow-hidden">
            {/* Toolbar */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-white">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search automations by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                />
              </div>

              <Button variant="outline" size="sm" onClick={fetchAutomations} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>
                Refresh
              </Button>
            </div>

            {/* Automations Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
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
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {filteredAutomations.map((automation) => {
                    const config = automation.trigger_config as { keywords?: string[] } || {};
                    const keywords = config.keywords || [];

                    return (
                      <tr key={automation.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-slate-900 font-bold text-sm">
                          {automation.name}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={automation.active ? 'success' : 'default'} dot={automation.active}>
                            {automation.active ? 'Active' : 'Disabled'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-700">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                            {automation.trigger_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5 flex-wrap max-w-xs">
                            {keywords.map((kw: string, i: number) => (
                              <span key={i} className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md border border-indigo-100">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700">
                          {automation.priority}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {automation.cooldown_seconds}s
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => toggleActive(automation)}
                            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                              automation.active
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                            }`}
                            title={automation.active ? 'Disable Rule' : 'Enable Rule'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAutomations.length === 0 && !loading && (
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Match Strategy
              </label>
              <select
                value={formData.trigger_type}
                onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
            placeholder="Hello! Our subscription plans start at $29/mo with direct Meta API integration."
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

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
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
