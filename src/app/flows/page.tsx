'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { FlowCanvas } from '@/components/flows/FlowCanvas';
import { FlowRecord, FlowDefinition } from '@/lib/flows/types';
import { DEFAULT_SALON_FLOWS } from '@/lib/flows/service';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  Zap, 
  Plus, 
  GitBranch, 
  Play, 
  Edit3, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Split, 
  ChevronRight,
  Sliders,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function FlowsPage() {
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEditingFlow, setActiveEditingFlow] = useState<FlowRecord | null>(null);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flows');
      if (res.ok) {
        const data = await res.json();
        setFlows(data.flows || []);
      }
    } catch (e) {
      console.error('Error fetching flows:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewFlow = () => {
    const newFlow: FlowRecord = {
      id: `flow_${Date.now()}`,
      organization_id: 'org_main',
      name: 'New Custom Salon Flow',
      description: 'Custom interactive multi-step WhatsApp automation flow',
      trigger_type: 'KEYWORD',
      status: 'DRAFT',
      definition: {
        nodes: [
          {
            id: 'trigger_1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Keyword Trigger', node_type: 'trigger', config: { keywords: ['info', 'offers'] } }
          },
          {
            id: 'msg_1',
            type: 'message_text',
            position: { x: 100, y: 250 },
            data: { label: 'Send Information', node_type: 'message_text', config: { text: 'Hello {{name}}! How can we assist you today?' } }
          },
          {
            id: 'end_1',
            type: 'end',
            position: { x: 100, y: 400 },
            data: { label: 'End Flow', node_type: 'end', config: {} }
          }
        ],
        edges: [
          { id: 'e1-2', source: 'trigger_1', target: 'msg_1' },
          { id: 'e2-3', source: 'msg_1', target: 'end_1' }
        ]
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setActiveEditingFlow(newFlow);
  };

  const handleSaveCanvas = async (definition: FlowDefinition) => {
    if (!activeEditingFlow) return;
    const updated = { ...activeEditingFlow, definition, status: 'PUBLISHED' as const };
    
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          flow: updated
        })
      });
      const json = await res.json();
      if (json.success && json.flow) {
        setFlows(flows.map(f => f.id === activeEditingFlow.id ? json.flow : f));
      } else {
        setFlows(flows.map(f => f.id === updated.id ? updated : f));
      }
    } catch (e) {
      console.error('Failed to save flow', e);
      setFlows(flows.map(f => f.id === updated.id ? updated : f));
    }
    
    setActiveEditingFlow(null);
  };

  return (
    <div className="flex h-screen bg-[#F7F3EA] text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {activeEditingFlow ? (
          <div className="flex-1 h-full w-full">
            <FlowCanvas
              initialFlow={activeEditingFlow.definition}
              flowName={activeEditingFlow.name}
              onSave={handleSaveCanvas}
              onClose={() => setActiveEditingFlow(null)}
            />
          </div>
        ) : (
          <>
            <TopBar
              title="Visual Flow Studio"
              subtitle="Drag-and-drop interactive conversational automation, triggers, conditions, and delays."
              badge={<Badge variant="primary">{flows.length} Active Flows</Badge>}
              actions={
                <Button onClick={handleCreateNewFlow} leftIcon={<Plus className="w-4 h-4" />}>
                  Create New Flow
                </Button>
              }
            />

            <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-6">
              
              {/* Studio Overview Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#111827] to-[#0F172A] border border-[#EFE3CF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-400">Production Node Engine</span>
                  </div>
                  <h3 className="text-lg font-black text-white">Visual Drag-and-Drop Automation Studio</h3>
                  <p className="text-xs text-[#7C756D] max-w-xl">
                    Build complex multi-branch conversation flows, RFM winback triggers, and POS API integrations with real-time state machine execution.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="success" className="py-1.5 px-3">ReactFlow v12 Powered</Badge>
                </div>
              </div>

              {/* Flow Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {flows.map((flow) => {
                  const nodeCount = flow.definition?.nodes?.length || 0;
                  return (
                    <div
                      key={flow.id}
                      className="p-6 rounded-3xl bg-[#FAF7F2] border border-[#EFE3CF] hover:border-indigo-500/80 transition-all group flex flex-col justify-between space-y-4 shadow-xl"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase tracking-wider flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-indigo-400" />
                            {flow.trigger_type}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                            {flow.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-black text-white group-hover:text-indigo-400 transition-colors">
                            {flow.name}
                          </h4>
                          <p className="text-xs text-[#7C756D] mt-1 line-clamp-2">
                            {flow.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] font-medium text-[#7C756D] pt-2 border-t border-[#EFE3CF]/60">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-[#7C756D]" />
                            {nodeCount} Nodes
                          </span>
                          <span className="flex items-center gap-1">
                            <Split className="w-3.5 h-3.5 text-amber-400" />
                            Multi-Branch
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveEditingFlow(flow)}
                          className="w-full justify-between"
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                        >
                          Open Visual Canvas
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </main>
          </>
        )}

      </div>
    </div>
  );
}
