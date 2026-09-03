'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  BackgroundVariant,
  MarkerType,
  EdgeProps,
  getBezierPath,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Zap,
  MessageSquare,
  Split,
  Clock,
  Globe,
  CheckCircle2,
  X,
  Save,
  Sparkles,
  Trash2,
  Image as ImageIcon,
  LayoutGrid,
  MousePointerClick,
  Tag,
  Plus,
  Upload,
  Loader2,
  Pencil,
  Phone,
  Link
} from 'lucide-react';
import type { FlowDefinition, FlowNode as FlowNodeType, FlowEdge } from '@/lib/flows/types';
import { Button } from '@/components/ui/Button';

// ─── Node Styles ─────────────────────────────────────────────────────────────

const NODE_STYLES: Record<string, { bg: string; border: string; icon: any; color: string; label: string }> = {
  trigger:         { bg: '#EEF2FF', border: '#6366F1', icon: Zap,              color: '#4F46E5', label: 'Trigger' },
  message_text:    { bg: '#F0FDF4', border: '#22C55E', icon: MessageSquare,     color: '#16A34A', label: 'Text Message' },
  message_image:   { bg: '#FFF7ED', border: '#F97316', icon: ImageIcon,         color: '#EA580C', label: 'Image / Media' },
  message_buttons: { bg: '#F5F3FF', border: '#A855F7', icon: MousePointerClick, color: '#9333EA', label: 'Interactive Buttons' },
  message_cta:     { bg: '#FFF1F2', border: '#E11D48', icon: Globe,             color: '#BE123C', label: 'Link / Call Action' },
  message_card:    { bg: '#FFF7ED', border: '#F59E0B', icon: LayoutGrid,        color: '#D97706', label: 'Card (Image + Buttons)' },
  logic_condition: { bg: '#FFFBEB', border: '#EAB308', icon: Split,             color: '#CA8A04', label: 'Condition (IF / ELSE)' },
  timing_delay:    { bg: '#F0F9FF', border: '#0EA5E9', icon: Clock,             color: '#0284C7', label: 'Wait / Delay' },
  add_tag:         { bg: '#F0FDF4', border: '#10B981', icon: Tag,               color: '#059669', label: 'Add Tag' },
  integration_api: { bg: '#FDF4FF', border: '#D946EF', icon: Globe,             color: '#C026D3', label: 'API / Webhook' },
  end:             { bg: '#F9FAFB', border: '#6B7280', icon: CheckCircle2,      color: '#4B5563', label: 'End Flow' }
};

// ─── Custom Deletable Edge ────────────────────────────────────────────────────

function DeletableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, selected }: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const deleteEdge = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges(eds => eds.filter(ed => ed.id !== id));
  }, [id, setEdges]);

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd as string}
        style={{ ...style, strokeWidth: selected ? 3 : 2, stroke: '#B08D57' }}
      />
      <path d={edgePath} strokeOpacity={0} strokeWidth={20} fill="none" className="react-flow__edge-interaction" />
      {selected && (
        <g transform={`translate(${labelX - 10}, ${labelY - 10})`}>
          <circle cx={10} cy={10} r={12} fill="white" stroke="#EF4444" strokeWidth={1.5} />
          <foreignObject x={2} y={2} width={16} height={16}>
            <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={deleteEdge}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
                title="Delete connection"
              >
                <X className="w-2.5 h-2.5" strokeWidth={3} />
              </button>
            </div>
          </foreignObject>
        </g>
      )}
    </>
  );
}

const edgeTypes = { deletable: DeletableEdge };

// ─── Image Uploader Component ─────────────────────────────────────────────────

function ImageUploader({ value, onChange, fieldKey }: { value: string; onChange: (key: string, val: string) => void; fieldKey: string }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image must be under 5MB.'); return; }
    setUploadError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/media/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (json.url) {
        onChange(fieldKey, json.url);
      } else {
        setUploadError(json.error || 'Upload failed.');
      }
    } catch {
      setUploadError('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative rounded-xl overflow-hidden border border-[#E5DED2]" style={{ height: 80 }}>
          <img src={value} alt="preview" className="w-full h-full object-cover"
            onError={(e: any) => { e.target.style.display = 'none'; }} />
          <button onClick={() => onChange(fieldKey, '')}
            className="absolute top-1 right-1 p-0.5 bg-black/50 rounded-full text-white hover:bg-black/70">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-[#B08D57] text-[#B08D57] hover:bg-[#B08D57]/10 text-[11px] font-bold transition-all disabled:opacity-50"
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? 'Uploading…' : value ? 'Replace Image' : 'Upload Image'}
      </button>
      <input
        type="text" value={value}
        onChange={e => onChange(fieldKey, e.target.value)}
        placeholder="or paste image URL here…"
        className="w-full px-3 py-1.5 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[10px] text-[#292722] outline-none focus:border-[#B08D57]"
      />
      {uploadError && <p className="text-[10px] text-red-500">{uploadError}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  );
}

// ─── Button Manager ───────────────────────────────────────────────────────────

function ButtonManager({ buttons, onChange, accentColor }: { buttons: any[]; onChange: (btns: any[]) => void; accentColor: string }) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');

  const startEdit = (i: number, title: string) => { setEditingIdx(i); setEditVal(title); };
  const commitEdit = () => {
    if (editingIdx === null) return;
    const next = [...buttons];
    next[editingIdx] = { ...next[editingIdx], title: editVal };
    onChange(next);
    setEditingIdx(null);
  };
  const addButton = () => {
    if (buttons.length >= 3) return;
    onChange([...buttons, { id: `btn_${Date.now()}`, title: `Option ${buttons.length + 1}` }]);
  };
  const removeButton = (i: number) => onChange(buttons.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-bold text-[#706B61]">Buttons (max 3)</label>
      {buttons.map((btn: any, i: number) => (
        <div key={btn.id} className="flex items-center gap-1.5 rounded-xl border border-[#E5DED2] bg-[#F8F5EF] px-2 py-1.5">
          {editingIdx === i ? (
            <input
              autoFocus value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commitEdit()}
              onBlur={commitEdit}
              className="flex-1 bg-white border border-[#B08D57] rounded-lg px-2 py-0.5 text-xs text-[#292722] outline-none"
            />
          ) : (
            <div className="flex-1 px-1.5 py-0.5 rounded-lg text-[11px] font-bold text-[#292722] truncate"
              style={{ borderLeft: `3px solid ${accentColor}` }}>
              {btn.title}
            </div>
          )}
          {editingIdx !== i && (
            <button onClick={() => startEdit(i, btn.title)}
              className="p-1 rounded-lg hover:bg-white text-[#706B61] hover:text-[#292722] shrink-0">
              <Pencil className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => removeButton(i)}
            className="p-1 rounded-lg hover:bg-red-50 text-[#9E968D] hover:text-red-500 shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {buttons.length < 3 && (
        <button onClick={addButton}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-dashed text-[11px] font-bold transition-all"
          style={{ borderColor: accentColor + '55', color: accentColor, backgroundColor: accentColor + '0d' }}>
          <Plus className="w-3 h-3" />
          Add Button
        </button>
      )}
      <p className="text-[10px] text-[#9E968D]">Each button has its own branch dot at the bottom of the node. Drag from it to connect.</p>
    </div>
  );
}

// ─── Custom Node ─────────────────────────────────────────────────────────────

function FlowNode({ data, selected }: any) {
  const style = NODE_STYLES[data.node_type] || NODE_STYLES.message_text;
  const Icon = style.icon;
  const isCondition = data.node_type === 'logic_condition';
  const isTrigger = data.node_type === 'trigger';
  const isEnd = data.node_type === 'end';
  const isButtons = data.node_type === 'message_buttons';
  const btns: any[] = isButtons ? (data.config?.buttons || []).slice(0, 3) : [];

  const previewText = (() => {
    const cfg = data.config || {};
    if (data.node_type === 'trigger') return cfg.match_all ? '⚡ ANY message (Catch-all)' : ((cfg.keywords || []).join(', ') || 'Set keywords →');
    if (data.node_type === 'message_text') return cfg.text?.substring(0, 60) + (cfg.text?.length > 60 ? '…' : '') || 'Set message text →';
    if (data.node_type === 'message_image') return cfg.caption?.substring(0, 40) || (cfg.url ? '📷 Image attached' : 'Upload image →');
    if (data.node_type === 'message_buttons') return cfg.text?.substring(0, 40) || 'Set message body →';
    if (data.node_type === 'message_cta') return `${cfg.action_type === 'call' ? '📞' : '🔗'} ${cfg.action_title || 'Set action →'}`;
    if (data.node_type === 'message_card') return cfg.title || 'Set card title →';
    if (data.node_type === 'logic_condition') return `IF ${cfg.field || '?'} ${cfg.operator || '?'} ${cfg.value ?? ''}`;
    if (data.node_type === 'timing_delay') {
      const d = cfg.days || 0, h = cfg.hours || 0, m = cfg.minutes || 0;
      if (!d && !h && !m) return 'Set delay duration →';
      return `⏱ ${[d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ')}`;
    }
    if (data.node_type === 'add_tag') return `🏷 ${cfg.tag || 'Set tag name →'}`;
    if (data.node_type === 'integration_api') return cfg.url?.substring(0, 40) || 'Set API URL →';
    if (data.node_type === 'end') return '✅ Conversation complete';
    return '';
  })();

  return (
    <div
      className="rounded-2xl shadow-lg overflow-hidden transition-all duration-150"
      style={{
        minWidth: 220, maxWidth: 280,
        backgroundColor: style.bg,
        border: `2px solid ${selected ? '#B08D57' : style.border}`,
        boxShadow: selected ? `0 0 0 3px ${style.border}44, 0 8px 20px rgba(0,0,0,0.12)` : '0 4px 12px rgba(0,0,0,0.07)'
      }}
    >
      {!isTrigger && (
        <Handle type="target" position={Position.Top}
          className="!w-3.5 !h-3.5 !bg-white !border-2" style={{ borderColor: style.border }} />
      )}
      <div className="flex items-center gap-2 px-3.5 py-2.5"
        style={{ background: `linear-gradient(135deg, ${style.border}33 0%, ${style.border}18 100%)` }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: style.border + '22' }}>
          <Icon className="w-3.5 h-3.5" style={{ color: style.color }} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest truncate" style={{ color: style.color }}>{style.label}</span>
      </div>
      <div className="px-3.5 py-2.5">
        <p className="text-[11px] font-bold text-[#292722] mb-1 leading-tight">{data.label}</p>
        {previewText && <p className="text-[10px] text-[#706B61] leading-snug line-clamp-2">{previewText}</p>}
        {(data.node_type === 'message_image' || data.node_type === 'message_buttons') && (data.config?.url || data.config?.header_image_url) && (
          <div className="mt-1.5 rounded-lg overflow-hidden border border-[#E5DED2]" style={{ height: 48 }}>
            <img src={data.config.url || data.config.header_image_url} alt=""
              className="w-full h-full object-cover"
              onError={(e: any) => { e.target.style.display = 'none'; }} />
          </div>
        )}
        {isButtons && btns.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {btns.map((btn: any, i: number) => (
              <div key={i} className="px-2 py-1 rounded-lg border text-[9px] font-bold text-center truncate"
                style={{ borderColor: style.border + '44', backgroundColor: style.border + '11', color: style.color }}>
                {btn.title}
              </div>
            ))}
          </div>
        )}
      </div>
      {!isEnd && !isCondition && !isButtons && (
        <Handle type="source" position={Position.Bottom}
          className="!w-3.5 !h-3.5 !bg-white !border-2" style={{ borderColor: style.border }} />
      )}
      {isButtons && btns.length > 0 && (
        <div className="relative" style={{ height: 28, paddingBottom: 4 }}>
          {btns.map((btn: any, idx: number) => {
            const pct = btns.length === 1 ? 50 : 20 + 30 * idx;
            return (
              <Handle key={btn.id} type="source" position={Position.Bottom} id={btn.id}
                title={`Branch: ${btn.title}`}
                className="!w-3.5 !h-3.5 !bg-white !border-2"
                style={{ borderColor: style.border, left: `${pct}%` }} />
            );
          })}
          <div className="flex justify-around px-2 pt-1">
            {btns.map((btn: any, idx: number) => (
              <span key={idx} className="text-[8px] font-bold truncate max-w-[60px] text-center" style={{ color: style.color }}>
                {btn.title}
              </span>
            ))}
          </div>
        </div>
      )}
      {isCondition && (
        <>
          <Handle type="source" position={Position.Bottom} id="true"
            className="!w-3.5 !h-3.5 !bg-white !border-2" style={{ left: '28%', borderColor: '#22C55E' }} />
          <Handle type="source" position={Position.Bottom} id="false"
            className="!w-3.5 !h-3.5 !bg-white !border-2" style={{ left: '72%', borderColor: '#EF4444' }} />
          <div className="flex justify-between px-4 pb-2 text-[9px] font-black">
            <span className="text-green-600">✓ YES</span>
            <span className="text-red-500">✗ NO</span>
          </div>
        </>
      )}
    </div>
  );
}

const nodeTypes = {
  trigger: FlowNode, message_text: FlowNode, message_image: FlowNode,
  message_buttons: FlowNode, message_cta: FlowNode, message_card: FlowNode,
  logic_condition: FlowNode, timing_delay: FlowNode, add_tag: FlowNode,
  integration_api: FlowNode, end: FlowNode
};

const NODE_LIBRARY = [
  { section: 'Messages', items: [
    { type: 'message_text',    label: 'Text Message',        defaultConfig: { text: '' } },
    { type: 'message_image',   label: 'Image + Caption',     defaultConfig: { url: '', caption: '' } },
    { type: 'message_buttons', label: 'Buttons (Branching)', defaultConfig: { text: 'Choose an option:', buttons: [{ id: `btn_${Date.now()}`, title: 'Option 1' }] } },
    { type: 'message_cta',     label: 'Link / Call Button',  defaultConfig: { text: '', action_type: 'url', action_title: 'Visit Website', action_payload: 'https://' } },
    { type: 'message_card',    label: 'Card (Image + Btns)', defaultConfig: { image_url: '', title: '', body: '', buttons: [{ id: `btn_${Date.now()}`, title: 'Learn More' }] } },
  ]},
  { section: 'Logic & Flow', items: [
    { type: 'logic_condition', label: 'IF / ELSE Condition', defaultConfig: { field: 'opted_in', operator: 'is_true', value: '' } },
    { type: 'timing_delay',    label: 'Wait / Delay',        defaultConfig: { days: 0, hours: 0, minutes: 5 } },
    { type: 'add_tag',         label: 'Add Tag to Contact',  defaultConfig: { tag: '' } },
  ]},
  { section: 'Actions', items: [
    { type: 'integration_api', label: 'Call External API',   defaultConfig: { url: '', method: 'POST', body: '' } },
    { type: 'end',             label: 'End Flow',            defaultConfig: {} },
  ]}
];

// ─── Properties Panel ─────────────────────────────────────────────────────────

function PropertiesPanel({ node, onChange, onDelete, onClose }: {
  node: Node; onChange: (key: string, val: any) => void; onDelete: () => void; onClose: () => void;
}) {
  const cfg = (node.data.config as any) || {};
  const type = node.data.node_type as string;
  const style = NODE_STYLES[type] || NODE_STYLES.message_text;
  const Icon = style.icon;

  return (
    <div className="w-80 border-l border-[#E5DED2] bg-white flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5DED2] shrink-0"
        style={{ background: `linear-gradient(135deg, ${style.border}22 0%, ${style.border}0d 100%)` }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: style.border + '22' }}>
            <Icon className="w-3.5 h-3.5" style={{ color: style.color }} />
          </div>
          <span className="text-xs font-black text-[#292722]">{style.label}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[#E5DED2]/60 text-[#706B61] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-4 pt-2 pb-0 flex items-center gap-1.5">
        <span className="text-[9px] text-[#9E968D]">Tip: press</span>
        <kbd className="text-[9px] font-bold bg-[#F8F5EF] border border-[#E5DED2] rounded px-1">Del</kbd>
        <span className="text-[9px] text-[#9E968D]">key to delete this node</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-[#706B61] mb-1">Node Label</label>
          <input type="text" value={node.data.label as string}
            onChange={e => onChange('__label', e.target.value)}
            className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-[#B08D57] transition-colors" />
        </div>

        {type === 'trigger' && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input type="checkbox" checked={cfg.match_all || false} onChange={e => onChange('match_all', e.target.checked)} className="sr-only peer" />
                <div className="w-8 h-4 bg-[#E5DED2] rounded-full peer-checked:bg-[#B08D57] transition-colors"></div>
                <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
              </div>
              <span className="text-[11px] font-bold text-[#292722]">Trigger on ANY message</span>
            </label>
            {!cfg.match_all && (
              <div>
                <label className="block text-[11px] font-bold text-[#706B61] mb-1">Keywords (comma separated)</label>
                <input type="text" value={(cfg.keywords || []).join(', ')}
                  onChange={e => onChange('keywords', e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean))}
                  placeholder="hi, hello, menu, services"
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-[#B08D57]" />
                <p className="text-[10px] text-[#9E968D] mt-1">Flow starts when customer sends any of these words.</p>
              </div>
            )}
          </div>
        )}

        {type === 'message_text' && (
          <div>
            <label className="block text-[11px] font-bold text-[#706B61] mb-1">Message Text</label>
            <textarea rows={6} value={cfg.text || ''}
              onChange={e => onChange('text', e.target.value)}
              placeholder={`Hello {{name}}! Welcome to Classic Pearl Salon.\n\nUse {{name}} for customer name.`}
              className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-[#B08D57] resize-none" />
            <p className="text-[10px] text-[#9E968D] mt-1">Variables: <code>{'{{name}}'}</code>, <code>{'{{phone}}'}</code></p>
          </div>
        )}

        {type === 'message_image' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-2">Image</label>
              <ImageUploader value={cfg.url || ''} onChange={onChange} fieldKey="url" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Caption (optional)</label>
              <textarea rows={3} value={cfg.caption || ''}
                onChange={e => onChange('caption', e.target.value)}
                placeholder="Check out our latest offers!"
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-[#B08D57] resize-none" />
            </div>
          </>
        )}

        {type === 'message_buttons' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-2">Header Image (optional)</label>
              <ImageUploader value={cfg.header_image_url || ''} onChange={onChange} fieldKey="header_image_url" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Message Body</label>
              <textarea rows={3} value={cfg.text || ''}
                onChange={e => onChange('text', e.target.value)}
                placeholder="Please choose an option:"
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-[#B08D57] resize-none" />
            </div>
            <ButtonManager buttons={cfg.buttons || []} onChange={btns => onChange('buttons', btns)} accentColor={style.color} />
          </>
        )}

        {type === 'message_cta' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Message Body</label>
              <textarea rows={3} value={cfg.text || ''}
                onChange={e => onChange('text', e.target.value)}
                placeholder="Tap below to reach us:"
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-rose-400 resize-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Action Type</label>
              <div className="flex gap-2">
                {[{ v: 'url', icon: Link, lbl: 'URL / Directions' }, { v: 'call', icon: Phone, lbl: 'Phone Call' }].map(opt => (
                  <button key={opt.v} onClick={() => onChange('action_type', opt.v)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[10px] font-bold transition-all"
                    style={{
                      borderColor: cfg.action_type === opt.v ? '#E11D48' : '#E5DED2',
                      backgroundColor: cfg.action_type === opt.v ? '#FFF1F2' : '#F8F5EF',
                      color: cfg.action_type === opt.v ? '#BE123C' : '#706B61'
                    }}>
                    <opt.icon className="w-3 h-3" />{opt.lbl}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Button Title</label>
              <input type="text" value={cfg.action_title || ''} onChange={e => onChange('action_title', e.target.value)}
                placeholder="Get Directions" className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">
                {cfg.action_type === 'call' ? 'Phone Number (with country code)' : 'URL (Google Maps or website)'}
              </label>
              <input type="text" value={cfg.action_payload || ''} onChange={e => onChange('action_payload', e.target.value)}
                placeholder={cfg.action_type === 'call' ? '+91 98765 43210' : 'https://maps.google.com/...'}
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-rose-400" />
            </div>
          </>
        )}

        {type === 'message_card' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-2">Card Image</label>
              <ImageUploader value={cfg.image_url || ''} onChange={onChange} fieldKey="image_url" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Title</label>
              <input type="text" value={cfg.title || ''} onChange={e => onChange('title', e.target.value)}
                placeholder="Special Offer" className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Body Text</label>
              <textarea rows={3} value={cfg.body || ''} onChange={e => onChange('body', e.target.value)}
                placeholder="Description..." className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57] resize-none" />
            </div>
          </>
        )}

        {type === 'logic_condition' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Condition Field</label>
              <select value={cfg.field || 'opted_in'} onChange={e => onChange('field', e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none">
                <option value="opted_in">Marketing Opt-In (Yes/No)</option>
                <option value="days_since_visit">Days Since Last Visit</option>
                <option value="lifetime_spend">Lifetime Spend (&#8377;)</option>
                <option value="last_message_body">Last Message Text</option>
                <option value="tag">Has Tag</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Operator</label>
              <select value={cfg.operator || 'is_true'} onChange={e => onChange('operator', e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none">
                <option value="is_true">Is True / Yes</option>
                <option value="is_false">Is False / No</option>
                <option value="equals">Equals (=)</option>
                <option value="not_equals">Not Equals</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="contains">Contains</option>
              </select>
            </div>
            {['equals','not_equals','greater_than','less_than','contains'].includes(cfg.operator || '') && (
              <div>
                <label className="block text-[11px] font-bold text-[#706B61] mb-1">Value</label>
                <input type="text" value={cfg.value || ''} onChange={e => onChange('value', e.target.value)}
                  placeholder="45" className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
              </div>
            )}
            <p className="text-[10px] text-[#9E968D]">Connect <span className="text-green-600 font-bold">YES</span> handle for true, <span className="text-red-500 font-bold">NO</span> for false.</p>
          </>
        )}

        {type === 'timing_delay' && (
          <div className="space-y-3">
            <p className="text-[11px] text-[#706B61] font-bold">Wait this long before the next step:</p>
            {(['days','hours','minutes'] as const).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <label className="text-[11px] font-bold text-[#706B61] w-14 shrink-0 capitalize">{key}</label>
                <input type="number" min={0} value={cfg[key] || 0}
                  onChange={e => onChange(key, parseInt(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-sky-400" />
              </div>
            ))}
          </div>
        )}

        {type === 'add_tag' && (
          <div>
            <label className="block text-[11px] font-bold text-[#706B61] mb-1">Tag Name</label>
            <input type="text" value={cfg.tag || ''} onChange={e => onChange('tag', e.target.value)}
              placeholder="vip-client" className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
            <p className="text-[10px] text-[#9E968D] mt-1">Adds this tag to the contact's profile when reached.</p>
          </div>
        )}

        {type === 'integration_api' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">URL</label>
              <input type="text" value={cfg.url || ''} onChange={e => onChange('url', e.target.value)}
                placeholder="https://api.example.com/hook" className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Method</label>
              <select value={cfg.method || 'POST'} onChange={e => onChange('method', e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
          </>
        )}
      </div>
      <div className="px-4 py-3 border-t border-[#E5DED2] shrink-0">
        <button onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold transition-colors">
          <Trash2 className="w-3.5 h-3.5" />Delete Node
        </button>
      </div>
    </div>
  );
}

// ─── Main Canvas ──────────────────────────────────────────────────────────────

interface FlowCanvasProps {
  initialFlow: FlowDefinition;
  flowName: string;
  onSave: (definition: FlowDefinition) => void;
  onClose?: () => void;
}

function FlowCanvasInner({ initialFlow, flowName, onSave, onClose }: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow.nodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    (initialFlow.edges as unknown as Edge[]).map(e => ({ ...e, type: 'deletable' }))
  );
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (selectedNode) {
        setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
        setEdges(eds => eds.filter(ed => ed.source !== selectedNode.id && ed.target !== selectedNode.id));
        setSelectedNode(null);
      }
      if (selectedEdgeId) {
        setEdges(eds => eds.filter(ed => ed.id !== selectedEdgeId));
        setSelectedEdgeId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNode, selectedEdgeId, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge({
      ...params, type: 'deletable', animated: false,
      style: { stroke: '#B08D57', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#B08D57' }
    }, eds)),
    [setEdges]
  );

  const handleNodeClick = (_: any, node: Node) => {
    setSelectedNode(node); setSelectedEdgeId(null);
    setEdges(eds => eds.map(e => ({ ...e, selected: false })));
  };
  const handleEdgeClick = (_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id); setSelectedNode(null);
    setEdges(eds => eds.map(e => ({ ...e, selected: e.id === edge.id })));
  };
  const handlePaneClick = () => {
    setSelectedNode(null); setSelectedEdgeId(null);
    setEdges(eds => eds.map(e => ({ ...e, selected: false })));
  };

  const handleAddNode = (type: string, label: string, defaultConfig: any) => {
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id, type,
      position: { x: 260 + Math.random() * 160, y: 180 + nodes.length * 130 },
      data: { label, node_type: type, config: { ...defaultConfig } }
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNode(newNode);
  };

  const handleConfigChange = (key: string, value: any) => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n => {
      if (n.id !== selectedNode.id) return n;
      if (key === '__label') {
        const updated = { ...n, data: { ...n.data, label: value } };
        setSelectedNode(updated); return updated;
      }
      const updated = { ...n, data: { ...n.data, config: { ...(n.data.config as any), [key]: value } } };
      setSelectedNode(updated); return updated;
    }));
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const handleSave = () => {
    setSaving(true);
    onSave({ nodes: nodes as any[], edges: edges as any[] });
    setTimeout(() => setSaving(false), 800);
  };

  return (
    <div className="flex h-full w-full bg-[#F8F5EF] relative overflow-hidden">
      <div className="w-56 border-r border-[#E5DED2] bg-white flex flex-col shrink-0 overflow-hidden z-10">
        <div className="p-3 border-b border-[#E5DED2] shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black text-[#292722] truncate max-w-[120px]">{flowName}</span>
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={handleSave} isLoading={saving} leftIcon={<Save className="w-3 h-3" />} className="!text-[10px] !py-1 !px-2">
                {saving ? 'Saving…' : 'Save'}
              </Button>
              {onClose && (
                <button onClick={onClose} className="p-1.5 rounded-lg text-[#706B61] hover:bg-[#F1ECE3]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[9px] text-[#9E968D]">Click a block to add to canvas</p>
        </div>
        <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NODE_LIBRARY.map(section => (
            <div key={section.section}>
              <p className="text-[8px] font-black uppercase tracking-widest text-[#9E968D] px-2 pt-3 pb-1">{section.section}</p>
              {section.items.map(item => {
                const s = NODE_STYLES[item.type] || NODE_STYLES.message_text;
                const Ico = s.icon;
                return (
                  <button key={item.type}
                    onClick={() => handleAddNode(item.type, item.label, item.defaultConfig)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[#F8F5EF] border border-transparent hover:border-[#E5DED2] text-left transition-all">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: s.border + '1a' }}>
                      <Ico className="w-3 h-3" style={{ color: s.color }} />
                    </div>
                    <span className="text-[10px] font-bold text-[#292722] leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-[#E5DED2] space-y-1 bg-[#FAFAF9]">
          <p className="text-[9px] text-[#B08D57] font-black">💡 SHORTCUTS</p>
          <p className="text-[9px] text-[#9E968D]">• Select node/edge → <kbd className="bg-white border border-[#E5DED2] rounded px-0.5 text-[8px]">Del</kbd> to delete</p>
          <p className="text-[9px] text-[#9E968D]">• Click edge → ✕ button to delete</p>
          <p className="text-[9px] text-[#9E968D]">• Drag from handle dot → connect</p>
        </div>
      </div>
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes} edgeTypes={edgeTypes}
          fitView fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={null}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#E5DED2" />
          <Controls className="!bg-white !border !border-[#E5DED2] !rounded-xl !shadow-sm" />
          <MiniMap className="!border !border-[#E5DED2] !rounded-xl !shadow-sm"
            nodeColor={n => { const s = NODE_STYLES[(n.data as any).node_type]; return s?.border || '#E5DED2'; }} />
        </ReactFlow>
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center p-10 rounded-2xl bg-white/90 border-2 border-dashed border-[#E5DED2]">
              <Sparkles className="w-10 h-10 text-[#B08D57] mx-auto mb-3" />
              <p className="text-sm font-bold text-[#292722]">Canvas is empty</p>
              <p className="text-xs text-[#706B61] mt-1">Click a block from the left panel to get started</p>
            </div>
          </div>
        )}
      </div>
      {selectedNode && (
        <PropertiesPanel node={selectedNode} onChange={handleConfigChange}
          onDelete={handleDeleteNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
