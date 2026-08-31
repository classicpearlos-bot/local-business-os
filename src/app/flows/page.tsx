'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { FlowCanvas } from '@/components/flows/FlowCanvas';
import { FlowRecord, FlowDefinition } from '@/lib/flows/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Zap,
  Plus,
  Sparkles,
  Clock,
  Split,
  Layers,
  ArrowRight,
  Trash2,
  Edit3,
  PlayCircle,
  PauseCircle,
  MoreVertical,
  MessageSquare,
  Users,
  Calendar,
  GitBranch,
  AlertCircle
} from 'lucide-react';

const TRIGGER_LABELS: Record<string, string> = {
  KEYWORD: '💬 Keyword',
  BUTTON_CLICK: '🔘 Button Click',
  NEW_CONTACT: '👤 New Contact',
  APPOINTMENT_COMPLETED: '📅 Appointment Done',
  BIRTHDAY: '🎂 Birthday',
  '45_DAY_INACTIVE': '⏰ 45-Day Inactive',
  '90_DAY_INACTIVE': '⏰ 90-Day Inactive',
  MANUAL_LAUNCH: '▶️ Manual Launch'
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  DRAFT: 'bg-amber-100 text-amber-800 border-amber-200',
  PAUSED: 'bg-slate-100 text-slate-600 border-slate-200',
  ARCHIVED: 'bg-red-100 text-red-700 border-red-200'
};

export default function FlowsPage() {
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEditingFlow, setActiveEditingFlow] = useState<FlowRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDesc, setNewFlowDesc] = useState('');
  const [newFlowTrigger, setNewFlowTrigger] = useState<string>('KEYWORD');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/flows');
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Failed to load flows');
      }
      const data = await res.json();
      setFlows(data.flows || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) return;
    setCreating(true);
    try {
      const newFlow = {
        // No ID — let the DB generate a UUID
        name: newFlowName.trim(),
        description: newFlowDesc.trim() || 'New automation flow',
        trigger_type: newFlowTrigger,
        trigger_config: newFlowTrigger === 'KEYWORD' ? { keywords: [] } : {},
        status: 'DRAFT' as const,
        definition: {
          nodes: [
            {
              id: 'trigger_1',
              type: 'trigger',
              position: { x: 300, y: 60 },
              data: {
                label: 'Trigger',
                node_type: 'trigger' as const,
                config: newFlowTrigger === 'KEYWORD' ? { keywords: [] } : {}
              }
            },
            {
              id: 'msg_1',
              type: 'message_text',
              position: { x: 300, y: 220 },
              data: {
                label: 'Send Message',
                node_type: 'message_text' as const,
                config: { text: 'Hello {{name}}! How can we help you?' }
              }
            },
            {
              id: 'end_1',
              type: 'end',
              position: { x: 300, y: 400 },
              data: { label: 'End Flow', node_type: 'end' as const, config: {} }
            }
          ],
          edges: [
            { id: 'e1-2', source: 'trigger_1', target: 'msg_1' },
            { id: 'e2-3', source: 'msg_1', target: 'end_1' }
          ]
        }
      };

      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', flow: newFlow })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create flow');

      setFlows(prev => [json.flow, ...prev]);
      setShowCreateModal(false);
      setNewFlowName('');
      setNewFlowDesc('');
      setNewFlowTrigger('KEYWORD');
      // Open the canvas immediately for editing
      setActiveEditingFlow(json.flow);
    } catch (e: any) {
      alert('Error creating flow: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveCanvas = async (definition: FlowDefinition) => {
    if (!activeEditingFlow) return;
    setSaveError(null);

    const updated = { ...activeEditingFlow, definition, status: 'PUBLISHED' as const };

    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', flow: updated })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Save failed');

      // Update list with the returned real record (has correct DB version etc.)
      setFlows(prev => prev.map(f => f.id === activeEditingFlow.id ? json.flow : f));
      setActiveEditingFlow(null);
    } catch (e: any) {
      setSaveError(e.message);
      // Still close the canvas but warn user
      setFlows(prev => prev.map(f => f.id === updated.id ? updated : f));
      setActiveEditingFlow(null);
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('Are you sure you want to delete this flow? This cannot be undone.')) return;
    setDeletingId(flowId);
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', flow_id: flowId })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
      setFlows(prev => prev.filter(f => f.id !== flowId));
    } catch (e: any) {
      alert('Error deleting flow: ' + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (flow: FlowRecord) => {
    const newStatus = flow.status === 'PUBLISHED' ? 'PAUSED' : 'PUBLISHED';
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', flow: { ...flow, status: newStatus } })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update status');
      setFlows(prev => prev.map(f => f.id === flow.id ? json.flow : f));
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  // ─── Canvas editing mode ───────────────────────────────────────────────
  if (activeEditingFlow) {
    return (
      <div className="flex h-screen bg-[#F8F5EF]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {saveError && (
            <div className="bg-red-50 border-b border-red-200 px-6 py-2 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Last save failed: {saveError}. Changes may not be persisted.
            </div>
          )}
          <FlowCanvas
            initialFlow={activeEditingFlow.definition}
            flowName={activeEditingFlow.name}
            onSave={handleSaveCanvas}
            onClose={() => setActiveEditingFlow(null)}
          />
        </div>
      </div>
    );
  }

  // ─── Flow List mode ────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#F8F5EF] text-[#292722]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Visual Flow Studio"
          subtitle="Build multi-step WhatsApp automation flows with triggers, messages, buttons, conditions and delays."
          badge={<Badge variant="primary">{flows.length} Flow{flows.length !== 1 ? 's' : ''}</Badge>}
          actions={
            <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Create New Flow
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-6">

          {/* Studio info banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#B08D57] to-[#8C6514] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white/80" />
                <span className="text-xs font-black uppercase tracking-wider text-white/80">Production Flow Engine</span>
              </div>
              <h3 className="text-lg font-black text-white">Visual Drag-and-Drop Automation Studio</h3>
              <p className="text-xs text-white/70 max-w-xl">
                Build flows with Text Messages, Media, Interactive Buttons, IF/ELSE Conditions, Delays, and more.
                Each flow triggers automatically from the inbox when customers match the trigger.
              </p>
            </div>
            <Badge variant="success" className="py-1.5 px-3 shrink-0">ReactFlow v12 Powered</Badge>
          </div>

          {/* Error state */}
          {error && (
            <div className="p-5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="font-bold text-red-700">Failed to load flows</p>
                <p className="text-sm text-red-600">{error}</p>
                <p className="text-xs text-red-500 mt-1">The <code>flows</code> table may not exist yet. Run the migration SQL from <code>supabase/migrations/005_phase2_flow_engine.sql</code> in your Supabase Dashboard → SQL Editor.</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchFlows} className="ml-auto shrink-0">Retry</Button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-52 rounded-2xl bg-white/60 border border-[#E5DED2] animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && flows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F1ECE3] border-2 border-[#E5DED2] flex items-center justify-center mb-4">
                <GitBranch className="w-7 h-7 text-[#B08D57]" />
              </div>
              <h3 className="text-xl font-black text-[#292722] mb-2">No flows yet</h3>
              <p className="text-sm text-[#706B61] max-w-sm mb-6">
                Create your first automation flow to start sending automated WhatsApp messages based on customer behaviour.
              </p>
              <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
                Create Your First Flow
              </Button>
            </div>
          )}

          {/* Flow cards grid */}
          {!loading && !error && flows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {flows.map((flow) => {
                const nodeCount = flow.definition?.nodes?.length || 0;
                const edgeCount = flow.definition?.edges?.length || 0;
                const isDeleting = deletingId === flow.id;

                return (
                  <div
                    key={flow.id}
                    className="p-5 rounded-2xl bg-white border border-[#E5DED2] hover:border-[#B08D57]/60 hover:shadow-lg transition-all flex flex-col justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-3">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${STATUS_COLORS[flow.status] || STATUS_COLORS.DRAFT}`}>
                          {flow.status}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleStatus(flow)}
                            title={flow.status === 'PUBLISHED' ? 'Pause flow' : 'Publish flow'}
                            className="p-1.5 rounded-lg hover:bg-[#F1ECE3] transition-colors text-[#706B61] hover:text-[#B08D57]"
                          >
                            {flow.status === 'PUBLISHED'
                              ? <PauseCircle className="w-4 h-4" />
                              : <PlayCircle className="w-4 h-4" />
                            }
                          </button>
                          <button
                            onClick={() => handleDeleteFlow(flow.id)}
                            disabled={isDeleting}
                            title="Delete flow"
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-[#706B61] hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Flow name & description */}
                      <div>
                        <h4 className="text-base font-black text-[#292722] leading-tight">{flow.name}</h4>
                        <p className="text-xs text-[#706B61] mt-1 line-clamp-2">{flow.description}</p>
                      </div>

                      {/* Trigger badge */}
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#F1ECE3] text-[#B08D57] border border-[#E5DED2]">
                          {TRIGGER_LABELS[flow.trigger_type] || flow.trigger_type}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 text-[11px] font-medium text-[#706B61] pt-2 border-t border-[#E5DED2]">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          {nodeCount} Nodes
                        </span>
                        <span className="flex items-center gap-1">
                          <Split className="w-3.5 h-3.5 text-amber-500" />
                          {edgeCount} Connections
                        </span>
                        {flow.version && (
                          <span className="flex items-center gap-1">
                            v{flow.version}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Open canvas button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveEditingFlow(flow)}
                      className="w-full justify-between"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      <span className="flex items-center gap-2">
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Flow Canvas
                      </span>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Create Flow Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setNewFlowName(''); setNewFlowDesc(''); }}
        title="Create New Flow"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#292722] mb-1.5">Flow Name *</label>
            <Input
              value={newFlowName}
              onChange={e => setNewFlowName(e.target.value)}
              placeholder="e.g. Welcome Greeting Flow"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#292722] mb-1.5">Description</label>
            <textarea
              value={newFlowDesc}
              onChange={e => setNewFlowDesc(e.target.value)}
              placeholder="What does this flow do?"
              rows={3}
              className="w-full px-3 py-2 bg-white border border-[#E5DED2] rounded-xl text-sm text-[#292722] outline-none focus:border-[#B08D57] resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#292722] mb-1.5">Trigger Type</label>
            <select
              value={newFlowTrigger}
              onChange={e => setNewFlowTrigger(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E5DED2] rounded-xl text-sm text-[#292722] outline-none focus:border-[#B08D57]"
            >
              <option value="KEYWORD">💬 Keyword — when customer sends a specific word</option>
              <option value="NEW_CONTACT">👤 New Contact — when a new contact is created</option>
              <option value="BIRTHDAY">🎂 Birthday — on customer's birthday</option>
              <option value="45_DAY_INACTIVE">⏰ 45-Day Inactive — re-engage slipping clients</option>
              <option value="90_DAY_INACTIVE">⏰ 90-Day Inactive — re-engage lost clients</option>
              <option value="APPOINTMENT_COMPLETED">📅 Appointment Completed — post-visit follow-up</option>
              <option value="MANUAL_LAUNCH">▶️ Manual Launch — triggered manually from Inbox</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => { setShowCreateModal(false); setNewFlowName(''); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFlow}
              isLoading={creating}
              disabled={!newFlowName.trim()}
              className="flex-1"
            >
              Create & Open Editor
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
