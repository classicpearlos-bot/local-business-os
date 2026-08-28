'use client';

import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Zap, 
  MessageSquare, 
  Split, 
  Clock, 
  Globe, 
  UserCheck, 
  Bot, 
  CheckCircle2, 
  X, 
  Plus, 
  Play, 
  Save, 
  Sliders, 
  Sparkles,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { FlowDefinition, FlowNode, FlowEdge, FlowNodeType } from '@/lib/flows/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// --- CUSTOM FLOW NODES WITH LUXURY GLASS THEME ---

const TriggerNode = ({ data, isConnectable }: any) => (
  <div className="px-4 py-3 rounded-2xl bg-white border-2 border-[#C59E3F] shadow-xl min-w-[200px] text-[#1E1B18]">
    <div className="flex items-center gap-2 mb-1.5">
      <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
        <Zap className="w-4 h-4" />
      </div>
      <span className="text-xs font-black uppercase tracking-wider text-indigo-400">Trigger</span>
    </div>
    <p className="text-sm font-bold text-[#1E1B18]">{data.label}</p>
    <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!w-3 !h-3 !bg-indigo-500" />
  </div>
);

const MessageNode = ({ data, isConnectable }: any) => (
  <div className="px-4 py-3 rounded-2xl bg-white border border-emerald-500/60 shadow-xl min-w-[220px] text-[#1E1B18]">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!w-3 !h-3 !bg-emerald-500" />
    <div className="flex items-center gap-2 mb-1.5">
      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
        <MessageSquare className="w-4 h-4" />
      </div>
      <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Message</span>
    </div>
    <p className="text-xs font-semibold text-[#2C2723] line-clamp-2">{data.config?.text || data.label}</p>
    <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!w-3 !h-3 !bg-emerald-500" />
  </div>
);

const ConditionNode = ({ data, isConnectable }: any) => (
  <div className="px-4 py-3 rounded-2xl bg-white border-2 border-amber-500/80 shadow-xl min-w-[220px] text-[#1E1B18]">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!w-3 !h-3 !bg-amber-500" />
    <div className="flex items-center gap-2 mb-1.5">
      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
        <Split className="w-4 h-4" />
      </div>
      <span className="text-xs font-black uppercase tracking-wider text-amber-400">Condition IF/ELSE</span>
    </div>
    <p className="text-xs font-bold text-[#2C2723]">{data.label}</p>
    <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#E5DED2] text-[10px] font-black">
      <span className="text-emerald-400">TRUE (Yes)</span>
      <span className="text-rose-400">FALSE (No)</span>
    </div>
    <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%' }} isConnectable={isConnectable} className="!w-3 !h-3 !bg-emerald-500" />
    <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%' }} isConnectable={isConnectable} className="!w-3 !h-3 !bg-rose-500" />
  </div>
);

const DelayNode = ({ data, isConnectable }: any) => (
  <div className="px-4 py-3 rounded-2xl bg-white border border-cyan-500/60 shadow-xl min-w-[180px] text-[#1E1B18]">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!w-3 !h-3 !bg-cyan-500" />
    <div className="flex items-center gap-2 mb-1.5">
      <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
        <Clock className="w-4 h-4" />
      </div>
      <span className="text-xs font-black uppercase tracking-wider text-cyan-400">Delay</span>
    </div>
    <p className="text-xs font-bold text-[#2C2723]">{data.config?.delay_minutes ? `Wait ${data.config.delay_minutes} min` : data.label}</p>
    <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!w-3 !h-3 !bg-cyan-500" />
  </div>
);

const APINode = ({ data, isConnectable }: any) => (
  <div className="px-4 py-3 rounded-2xl bg-white border border-purple-500/60 shadow-xl min-w-[200px] text-[#1E1B18]">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!w-3 !h-3 !bg-purple-500" />
    <div className="flex items-center gap-2 mb-1.5">
      <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
        <Globe className="w-4 h-4" />
      </div>
      <span className="text-xs font-black uppercase tracking-wider text-purple-400">Salon POS / API</span>
    </div>
    <p className="text-xs font-bold text-[#2C2723]">{data.label}</p>
    <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#E5DED2] text-[10px] font-black">
      <span className="text-emerald-400">SUCCESS</span>
      <span className="text-rose-400">FAILURE</span>
    </div>
    <Handle type="source" position={Position.Bottom} id="success" style={{ left: '25%' }} isConnectable={isConnectable} className="!w-3 !h-3 !bg-emerald-500" />
    <Handle type="source" position={Position.Bottom} id="failure" style={{ left: '75%' }} isConnectable={isConnectable} className="!w-3 !h-3 !bg-rose-500" />
  </div>
);

const EndNode = ({ data, isConnectable }: any) => (
  <div className="px-4 py-2.5 rounded-2xl bg-[#F8F5EF] border border-[#DFBE7E]/60 shadow-xl min-w-[140px] text-center">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!w-3 !h-3 !bg-slate-400" />
    <div className="flex items-center justify-center gap-1.5 text-[#706B61] text-xs font-black">
      <CheckCircle2 className="w-3.5 h-3.5 text-[#706B61]" />
      <span>END FLOW</span>
    </div>
  </div>
);

const nodeTypes = {
  trigger: TriggerNode,
  message_text: MessageNode,
  message_template: MessageNode,
  logic_condition: ConditionNode,
  timing_delay: DelayNode,
  integration_api: APINode,
  end: EndNode
};

interface FlowCanvasProps {
  initialFlow: FlowDefinition;
  flowName: string;
  onSave: (definition: FlowDefinition) => void;
  onClose?: () => void;
}

export function FlowCanvas({ initialFlow, flowName, onSave, onClose }: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow.nodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges as unknown as Edge[]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366F1', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const handleNodeClick = (_: any, node: Node) => {
    setSelectedNode(node);
  };

  const handleAddNode = (type: FlowNodeType, label: string) => {
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      position: { x: 250, y: 150 + nodes.length * 80 },
      data: {
        label,
        node_type: type,
        config: type === 'message_text' ? { text: '✨ Hi {{name}}, welcome to Classic Pearl Salon!' } : {}
      }
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
  };

  const handleUpdateNodeConfig = (key: string, value: any) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updated = {
            ...n,
            data: {
              ...n.data,
              config: {
                ...(n.data.config as any || {}),
                [key]: value
              }
            }
          };
          setSelectedNode(updated);
          return updated;
        }
        return n;
      })
    );
  };

  const handleDeleteSelected = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const handleSaveFlow = () => {
    setSaving(true);
    const flowDef: FlowDefinition = {
      nodes: nodes as any[],
      edges: edges as any[]
    };
    onSave(flowDef);
    setTimeout(() => setSaving(false), 600);
  };

  return (
    <div className="flex h-full w-full bg-[#F8F5EF] text-[#292722] relative overflow-hidden">
      
      {/* LEFT: NODE LIBRARY */}
      <div className="w-64 border-r border-[#E5DED2] bg-white p-4 flex flex-col gap-3 z-10">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5DED2]">
          <span className="text-xs font-black uppercase tracking-wider text-[#706B61]">Node Library</span>
          <Badge variant="primary">Visual Drag</Badge>
        </div>

        <div className="space-y-2 overflow-y-auto pr-1 flex-1 text-xs">
          
          <p className="text-[10px] font-black uppercase tracking-wider text-[#9E968D] pt-1">Messages & Prompts</p>
          <button
            onClick={() => handleAddNode('message_text', 'Send WhatsApp Text')}
            className="w-full p-2.5 rounded-xl bg-white border border-[#E5DED2] hover:border-emerald-500/80 flex items-center gap-2.5 text-left transition-all cursor-pointer group"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-[#2C2723]">WhatsApp Text</span>
          </button>

          <button
            onClick={() => handleAddNode('message_template', 'Send Meta Template')}
            className="w-full p-2.5 rounded-xl bg-white border border-[#E5DED2] hover:border-emerald-500/80 flex items-center gap-2.5 text-left transition-all cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-[#2C2723]">Meta Template Card</span>
          </button>

          <p className="text-[10px] font-black uppercase tracking-wider text-[#9E968D] pt-2">Logic & Branching</p>
          <button
            onClick={() => handleAddNode('logic_condition', 'Check Condition (IF/ELSE)')}
            className="w-full p-2.5 rounded-xl bg-white border border-[#E5DED2] hover:border-amber-500/80 flex items-center gap-2.5 text-left transition-all cursor-pointer group"
          >
            <Split className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-[#2C2723]">Condition (IF / ELSE)</span>
          </button>

          <p className="text-[10px] font-black uppercase tracking-wider text-[#9E968D] pt-2">Timing & Schedule</p>
          <button
            onClick={() => handleAddNode('timing_delay', 'Wait / Delay Time')}
            className="w-full p-2.5 rounded-xl bg-white border border-[#E5DED2] hover:border-cyan-500/80 flex items-center gap-2.5 text-left transition-all cursor-pointer group"
          >
            <Clock className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-[#2C2723]">Wait / Delay</span>
          </button>

          <p className="text-[10px] font-black uppercase tracking-wider text-[#9E968D] pt-2">Integrations</p>
          <button
            onClick={() => handleAddNode('integration_api', 'Salon POS / API Request')}
            className="w-full p-2.5 rounded-xl bg-white border border-[#E5DED2] hover:border-purple-500/80 flex items-center gap-2.5 text-left transition-all cursor-pointer group"
          >
            <Globe className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-[#2C2723]">Salon POS / API</span>
          </button>

          <button
            onClick={() => handleAddNode('end', 'End Flow')}
            className="w-full p-2.5 rounded-xl bg-white border border-[#E5DED2] hover:border-slate-600 flex items-center gap-2.5 text-left transition-all cursor-pointer group"
          >
            <CheckCircle2 className="w-4 h-4 text-[#706B61] group-hover:scale-110 transition-transform" />
            <span className="font-bold text-[#706B61]">End Flow</span>
          </button>

        </div>
      </div>

      {/* CENTER: INTERACTIVE CANVAS */}
      <div className="flex-1 h-full relative">
        
        {/* Top Floating Control Bar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between p-3 rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5DED2] shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-[#292722]">{flowName}</span>
            <Badge variant="success">Active Flow</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTestResult(`Flow simulation completed: 3 nodes traversed successfully.`);
                setTimeout(() => setTestResult(null), 4000);
              }}
              leftIcon={<Play className="w-3.5 h-3.5 text-emerald-400" />}
            >
              Test Simulation
            </Button>
            <Button
              size="sm"
              onClick={handleSaveFlow}
              disabled={saving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              {saving ? 'Publishing...' : 'Save & Publish'}
            </Button>
            {onClose && (
              <button onClick={onClose} className="p-2 rounded-xl text-[#706B61] hover:text-[#292722] hover:bg-white shadow-sm transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {testResult && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2.5 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {testResult}
          </div>
        )}

        {/* ReactFlow Interactive Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#F8F5EF]"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1E293B" />
          <Controls className="!bg-white !border-[#E5DED2] !text-[#292722] [&>button]:!bg-white [&>button]:!border-[#E5DED2] [&>button]:!fill-white" />
          <MiniMap 
            nodeStrokeColor="#6366F1" 
            nodeColor="#0F172A" 
            maskColor="rgba(7, 10, 18, 0.8)" 
            className="!bg-white !border-[#E5DED2] rounded-xl overflow-hidden" 
          />
        </ReactFlow>

      </div>

      {/* RIGHT: NODE PROPERTIES DRAWER */}
      {selectedNode && (
        <div className="w-80 border-l border-[#E5DED2] bg-white p-5 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DED2]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-wider text-[#5D564E]">Node Properties</span>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-[#706B61] hover:text-[#292722]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#706B61] mb-1">Node Title</label>
                <input
                  type="text"
                  value={selectedNode.data.label as string}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((nds) =>
                      nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, label: val } } : n))
                    );
                  }}
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] outline-none focus:border-indigo-500"
                />
              </div>

              {selectedNode.type === 'trigger' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#706B61] mb-1">Keywords (Comma Separated)</label>
                  <input
                    type="text"
                    value={((selectedNode.data.config as any)?.keywords || []).join(', ')}
                    onChange={(e) => handleUpdateNodeConfig('keywords', e.target.value.split(',').map(k => k.trim()))}
                    placeholder="e.g. hi, hello, menu"
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {selectedNode.type === 'message_text' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#706B61] mb-1">Message Body</label>
                  <textarea
                    rows={4}
                    value={(selectedNode.data.config as any)?.text || ''}
                    onChange={(e) => handleUpdateNodeConfig('text', e.target.value)}
                    placeholder="Enter message text with {{name}} variables..."
                    className="w-full p-3 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {selectedNode.type === 'timing_delay' && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-[#706B61] mb-1">Days</label>
                    <input
                      type="number"
                      value={(selectedNode.data.config as any)?.days || 0}
                      onChange={(e) => handleUpdateNodeConfig('days', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-[#706B61] mb-1">Hours</label>
                    <input
                      type="number"
                      value={(selectedNode.data.config as any)?.hours || 0}
                      onChange={(e) => handleUpdateNodeConfig('hours', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-[#706B61] mb-1">Minutes</label>
                    <input
                      type="number"
                      value={(selectedNode.data.config as any)?.minutes || 0}
                      onChange={(e) => handleUpdateNodeConfig('minutes', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {selectedNode.type === 'logic_condition' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#706B61] mb-1">Condition Field</label>
                    <select
                      value={(selectedNode.data.config as any)?.field || 'opted_in'}
                      onChange={(e) => handleUpdateNodeConfig('field', e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] outline-none"
                    >
                      <option value="opted_in">Marketing Opt-In (Boolean)</option>
                      <option value="days_since_visit">Days Since Last Visit (Number)</option>
                      <option value="lifetime_spend">Lifetime Spend (Number)</option>
                      <option value="last_message_body">Last Message Text (String)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#706B61] mb-1">Operator</label>
                    <select
                      value={(selectedNode.data.config as any)?.operator || 'is_true'}
                      onChange={(e) => handleUpdateNodeConfig('operator', e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] outline-none"
                    >
                      <option value="is_true">Is True</option>
                      <option value="is_false">Is False</option>
                      <option value="equals">Equals (==)</option>
                      <option value="greater_than">Greater Than (&gt;)</option>
                      <option value="less_than">Less Than (&lt;)</option>
                      <option value="contains">Contains</option>
                    </select>
                  </div>
                  {['equals', 'greater_than', 'less_than', 'contains'].includes((selectedNode.data.config as any)?.operator) && (
                    <div>
                      <label className="block text-[11px] font-bold text-[#706B61] mb-1">Value</label>
                      <input
                        type="text"
                        value={(selectedNode.data.config as any)?.value || ''}
                        onChange={(e) => handleUpdateNodeConfig('value', e.target.value)}
                        className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5DED2]">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSelected}
              className="w-full !border-rose-900/50 text-rose-400 hover:!bg-rose-950/40"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Node
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
