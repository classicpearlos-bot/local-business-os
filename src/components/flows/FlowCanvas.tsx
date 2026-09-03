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
  BackgroundVariant,
  MarkerType
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
  Plus,
  Save,
  Sliders,
  Sparkles,
  Trash2,
  Image as ImageIcon,
  LayoutGrid,
  MousePointerClick,
  Tag,
  ChevronDown
} from 'lucide-react';
import type { FlowDefinition, FlowNode as FlowNodeType, FlowEdge, FlowNodeType as NodeType } from '@/lib/flows/types';
import { Button } from '@/components/ui/Button';

// ─── Node Styles ────────────────────────────────────────────────────────────

const NODE_STYLES: Record<string, { bg: string; border: string; icon: any; color: string; label: string }> = {
  trigger:         { bg: '#EEF2FF', border: '#6366F1', icon: Zap,              color: '#4F46E5', label: 'Trigger' },
  message_text:    { bg: '#F0FDF4', border: '#22C55E', icon: MessageSquare,     color: '#16A34A', label: 'Text Message' },
  message_image:   { bg: '#FFF7ED', border: '#F97316', icon: ImageIcon,         color: '#EA580C', label: 'Image / Media' },
  message_buttons: { bg: '#F5F3FF', border: '#A855F7', icon: MousePointerClick, color: '#9333EA', label: 'Interactive Buttons' },
  message_cta:     { bg: '#FFF1F2', border: '#E11D48', icon: Globe,             color: '#BE123C', label: 'Link / Call Action' },
  message_card:    { bg: '#FFF7ED', border: '#F59E0B', icon: LayoutGrid,        color: '#D97706', label: 'Card (Image + Caption + Buttons)' },
  logic_condition: { bg: '#FFFBEB', border: '#EAB308', icon: Split,             color: '#CA8A04', label: 'Condition (IF / ELSE)' },
  timing_delay:    { bg: '#F0F9FF', border: '#0EA5E9', icon: Clock,             color: '#0284C7', label: 'Wait / Delay' },
  add_tag:         { bg: '#F0FDF4', border: '#10B981', icon: Tag,               color: '#059669', label: 'Add Tag' },
  integration_api: { bg: '#FDF4FF', border: '#D946EF', icon: Globe,             color: '#C026D3', label: 'API / Webhook' },
  end:             { bg: '#F9FAFB', border: '#6B7280', icon: CheckCircle2,      color: '#4B5563', label: 'End Flow' }
};

// ─── Custom Node Component ───────────────────────────────────────────────────

function FlowNode({ data, selected }: any) {
  const style = NODE_STYLES[data.node_type] || NODE_STYLES.message_text;
  const Icon = style.icon;
  const isCondition = data.node_type === 'logic_condition';
  const isTrigger = data.node_type === 'trigger';
  const isEnd = data.node_type === 'end';

  const previewText = (() => {
    const cfg = data.config || {};
    if (data.node_type === 'trigger') return cfg.match_all ? 'ANY message (Catch-all)' : ((cfg.keywords || []).join(', ') || 'Set keywords in properties →');
    if (data.node_type === 'message_text') return cfg.text?.substring(0, 60) + (cfg.text?.length > 60 ? '...' : '') || 'Set message text →';
    if (data.node_type === 'message_image') return cfg.caption || (cfg.url ? 'Image attached' : 'Set image URL →');
    if (data.node_type === 'message_buttons') return `${(cfg.buttons || []).length} button(s) — ${cfg.text?.substring(0, 40) || 'Set message →'}`;
    if (data.node_type === 'message_cta') return `${cfg.action_type || 'URL'} — ${cfg.action_title || 'Action'}`;
    if (data.node_type === 'message_card') return cfg.title || 'Set card title →';
    if (data.node_type === 'logic_condition') return `IF ${cfg.field || '?'} ${cfg.operator || '?'} ${cfg.value ?? ''}`;
    if (data.node_type === 'timing_delay') {
      const d = cfg.days || 0, h = cfg.hours || 0, m = cfg.minutes || 0;
      if (!d && !h && !m) return 'Set delay duration →';
      return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ');
    }
    if (data.node_type === 'add_tag') return cfg.tag || 'Set tag name →';
    if (data.node_type === 'integration_api') return cfg.url?.substring(0, 50) || 'Set API URL →';
    if (data.node_type === 'end') return 'Conversation handled';
    return '';
  })();

  return (
    <div
      className="rounded-2xl shadow-lg min-w-[220px] max-w-[280px] overflow-hidden"
      style={{
        backgroundColor: style.bg,
        border: `2px solid ${selected ? '#B08D57' : style.border}`,
        boxShadow: selected ? `0 0 0 3px ${style.border}33` : '0 4px 12px rgba(0,0,0,0.08)'
      }}
    >
      {/* Input handle (top) — not on trigger */}
      {!isTrigger && (
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-white" style={{ borderColor: style.border, borderWidth: 2 }} />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: style.border + '22' }}>
        <Icon className="w-4 h-4 shrink-0" style={{ color: style.color }} />
        <span className="text-xs font-black uppercase tracking-wide truncate" style={{ color: style.color }}>
          {style.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-xs font-bold text-[#292722] mb-1 leading-tight">{data.label}</p>
        {previewText && (
          <p className="text-[10px] text-[#706B61] leading-snug line-clamp-2">{previewText}</p>
        )}
        {/* Button previews */}
        {data.node_type === 'message_buttons' && (data.config?.buttons || []).length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {(data.config.buttons as any[]).slice(0, 3).map((btn: any, i: number) => (
              <div key={i} className="px-2 py-1 rounded-lg border border-purple-200 bg-white text-[10px] font-bold text-purple-700 text-center truncate">
                {btn.title || 'Button'}
              </div>
            ))}
          </div>
        )}
        {/* CTA preview */}
        {data.node_type === 'message_cta' && data.config?.action_title && (
          <div className="mt-2 px-2 py-1 rounded-lg border border-rose-200 bg-white text-[10px] font-bold text-rose-700 text-center truncate flex justify-center items-center gap-1">
             {data.config.action_title}
          </div>
        )}
      </div>

      {/* Output handles */}
      {!isEnd && !isCondition && data.node_type !== 'message_buttons' && (
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-white" style={{ borderColor: style.border, borderWidth: 2 }} />
      )}

      {/* Button Branching Handles */}
      {data.node_type === 'message_buttons' && (
        <div className="flex justify-evenly pb-2 relative h-4 w-full px-4">
          {(data.config?.buttons || []).map((btn: any, idx: number) => {
             const left = 20 + (60 * (idx / Math.max(1, (data.config.buttons.length - 1)))) + '%';
             return (
               <Handle 
                 key={btn.id}
                 type="source" 
                 position={Position.Bottom} 
                 id={btn.id}
                 title={`Branch: ${btn.title}`}
                 style={{ 
                   borderColor: style.border, 
                   borderWidth: 2, 
                   backgroundColor: 'white', 
                   width: 12, 
                   height: 12,
                   left: (data.config.buttons.length === 1) ? '50%' : left
                 }} 
               />
             )
          })}
        </div>
      )}

      {isCondition && (
        <>
          <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%', borderColor: '#22C55E', borderWidth: 2, backgroundColor: 'white', width: 12, height: 12 }} />
          <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%', borderColor: '#EF4444', borderWidth: 2, backgroundColor: 'white', width: 12, height: 12 }} />
          <div className="flex justify-between px-4 pb-2 text-[9px] font-black">
            <span className="text-green-600 ml-1">✓ YES</span>
            <span className="text-red-500 mr-1">✗ NO</span>
          </div>
        </>
      )}
    </div>
  );
}

const nodeTypes = {
  trigger: FlowNode,
  message_text: FlowNode,
  message_image: FlowNode,
  message_buttons: FlowNode,
  message_cta: FlowNode,
  message_card: FlowNode,
  logic_condition: FlowNode,
  timing_delay: FlowNode,
  add_tag: FlowNode,
  integration_api: FlowNode,
  end: FlowNode
};

// ─── Node Library ────────────────────────────────────────────────────────────

const NODE_LIBRARY = [
  { section: 'Messages', items: [
    { type: 'message_text',    label: 'Text Message',            defaultConfig: { text: '' } },
    { type: 'message_image',   label: 'Image / Media',           defaultConfig: { url: '', caption: '' } },
    { type: 'message_buttons', label: 'Interactive Buttons',     defaultConfig: { text: 'Choose an option:', buttons: [{ id: 'btn_1', title: 'Option 1' }] } },
    { type: 'message_cta',     label: 'Link / Call Action',      defaultConfig: { text: 'Contact us:', action_type: 'url', action_title: 'Visit Website', action_payload: 'https://' } },
    { type: 'message_card',    label: 'Card (Image + Buttons)',  defaultConfig: { image_url: '', title: '', body: '', buttons: [{ id: 'btn_1', title: 'Learn More' }] } },
  ]},
  { section: 'Logic & Flow', items: [
    { type: 'logic_condition', label: 'IF / ELSE Condition',     defaultConfig: { field: 'opted_in', operator: 'is_true', value: '' } },
    { type: 'timing_delay',    label: 'Wait / Delay',            defaultConfig: { days: 0, hours: 0, minutes: 5 } },
    { type: 'add_tag',         label: 'Add Tag to Contact',      defaultConfig: { tag: '' } },
  ]},
  { section: 'Actions', items: [
    { type: 'integration_api', label: 'Call External API',       defaultConfig: { url: '', method: 'POST', body: '' } },
    { type: 'end',             label: 'End Flow',                defaultConfig: {} },
  ]}
];

// ─── Properties Panel ────────────────────────────────────────────────────────

function PropertiesPanel({ node, onChange, onDelete, onClose }: { node: Node; onChange: (key: string, val: any) => void; onDelete: () => void; onClose: () => void }) {
  const cfg = (node.data.config as any) || {};
  const type = node.data.node_type as string;
  const style = NODE_STYLES[type] || NODE_STYLES.message_text;
  const Icon = style.icon;
  const [newBtnTitle, setNewBtnTitle] = useState('');

  const addButton = () => {
    if (!newBtnTitle.trim()) return;
    const existing = cfg.buttons || [];
    onChange('buttons', [...existing, { id: `btn_${Date.now()}`, title: newBtnTitle.trim() }]);
    setNewBtnTitle('');
  };

  const removeButton = (index: number) => {
    const existing = cfg.buttons || [];
    onChange('buttons', existing.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="w-80 border-l border-[#E5DED2] bg-white flex flex-col h-full overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5DED2] shrink-0" style={{ backgroundColor: style.bg }}>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: style.color }} />
          <span className="text-xs font-black text-[#292722]">{style.label}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#E5DED2] text-[#706B61]">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

        {/* Node Title — always shown */}
        <div>
          <label className="block text-[11px] font-bold text-[#706B61] mb-1">Node Label</label>
          <input
            type="text"
            value={node.data.label as string}
            onChange={e => onChange('__label', e.target.value)}
            className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-[#B08D57]"
          />
        </div>

        {/* TRIGGER */}
        {type === 'trigger' && (
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={cfg.match_all || false} 
                onChange={e => onChange('match_all', e.target.checked)} 
                className="w-3.5 h-3.5 accent-[#B08D57]"
              />
              <span className="text-[11px] font-bold text-[#292722]">Trigger on ANY message (Catch-all)</span>
            </label>
            {!cfg.match_all && (
              <div>
                <label className="block text-[11px] font-bold text-[#706B61] mb-1">Keywords (comma separated)</label>
                <input
                  type="text"
                  value={(cfg.keywords || []).join(', ')}
                  onChange={e => onChange('keywords', e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean))}
                  placeholder="hi, hello, menu, services"
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-[#B08D57]"
                />
                <p className="text-[10px] text-[#9E968D] mt-1">Customer messages matching any keyword will start this flow.</p>
              </div>
            )}
          </div>
        )}

        {/* TEXT MESSAGE */}
        {type === 'message_text' && (
          <div>
            <label className="block text-[11px] font-bold text-[#706B61] mb-1">Message Text</label>
            <textarea
              rows={6}
              value={cfg.text || ''}
              onChange={e => onChange('text', e.target.value)}
              placeholder="Hello {{name}}! Welcome to Classic Pearl Salon.&#10;&#10;Use {{name}} for customer name."
              className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-[#B08D57] resize-none"
            />
            <p className="text-[10px] text-[#9E968D] mt-1">Variables: <code>{'{{name}}'}</code>, <code>{'{{phone}}'}</code></p>
          </div>
        )}

        {/* IMAGE / MEDIA */}
        {type === 'message_image' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Image URL</label>
              <input
                type="text"
                value={cfg.url || ''}
                onChange={e => onChange('url', e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-[#B08D57]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Caption (optional)</label>
              <textarea
                rows={3}
                value={cfg.caption || ''}
                onChange={e => onChange('caption', e.target.value)}
                placeholder="Check out our latest offers!"
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-[#B08D57] resize-none"
              />
            </div>
          </>
        )}

        {/* INTERACTIVE BUTTONS */}
        {type === 'message_buttons' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Header Image URL (Optional)</label>
              <input
                type="text"
                value={cfg.header_image_url || ''}
                onChange={e => onChange('header_image_url', e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-[#B08D57]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Message Body</label>
              <textarea
                rows={3}
                value={cfg.text || ''}
                onChange={e => onChange('text', e.target.value)}
                placeholder="Please choose an option:"
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-[#B08D57] resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-2">Buttons (max 3)</label>
              <div className="space-y-2">
                {(cfg.buttons || []).map((btn: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={btn.title}
                      onChange={e => {
                        const btns = [...(cfg.buttons || [])];
                        btns[i] = { ...btns[i], title: e.target.value };
                        onChange('buttons', btns);
                      }}
                      className="flex-1 px-2 py-1.5 bg-[#F8F5EF] border border-[#E5DED2] rounded-lg text-[#292722] text-xs outline-none focus:border-purple-400"
                    />
                    <button onClick={() => removeButton(i)} className="text-red-400 hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {(cfg.buttons || []).length < 3 && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newBtnTitle}
                    onChange={e => setNewBtnTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addButton()}
                    placeholder="Button label..."
                    className="flex-1 px-2 py-1.5 bg-[#F8F5EF] border border-[#E5DED2] rounded-lg text-[#292722] text-xs outline-none focus:border-purple-400"
                  />
                  <button onClick={addButton} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200">
                    Add
                  </button>
                </div>
              )}
              <p className="text-[10px] text-[#9E968D] mt-1">WhatsApp allows up to 3 interactive buttons per message.</p>
            </div>
          </>
        )}

        {/* CTA LINK / CALL */}
        {type === 'message_cta' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Message Body</label>
              <textarea
                rows={3}
                value={cfg.text || ''}
                onChange={e => onChange('text', e.target.value)}
                placeholder="Message explaining the link..."
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-[#292722] text-xs outline-none focus:border-rose-400 resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Action Type</label>
              <select value={cfg.action_type || 'url'} onChange={e => onChange('action_type', e.target.value)} className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none">
                <option value="url">URL Link (Directions / Web)</option>
                <option value="call">Phone Call</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Button Title</label>
              <input type="text" value={cfg.action_title || ''} onChange={e => onChange('action_title', e.target.value)} placeholder="Visit Website" className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Target (URL or Phone)</label>
              <input type="text" value={cfg.action_payload || ''} onChange={e => onChange('action_payload', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-rose-400" />
            </div>
          </>
        )}

        {/* CARD */}
        {type === 'message_card' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Card Image URL</label>
              <input type="text" value={cfg.image_url || ''} onChange={e => onChange('image_url', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Title</label>
              <input type="text" value={cfg.title || ''} onChange={e => onChange('title', e.target.value)} placeholder="Special Offer" className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Body Text</label>
              <textarea rows={3} value={cfg.body || ''} onChange={e => onChange('body', e.target.value)} placeholder="Description..." className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57] resize-none" />
            </div>
          </>
        )}

        {/* CONDITION */}
        {type === 'logic_condition' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Condition Field</label>
              <select value={cfg.field || 'opted_in'} onChange={e => onChange('field', e.target.value)} className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none">
                <option value="opted_in">Marketing Opt-In (Yes/No)</option>
                <option value="days_since_visit">Days Since Last Visit</option>
                <option value="lifetime_spend">Lifetime Spend (₹)</option>
                <option value="last_message_body">Last Message Text</option>
                <option value="tag">Has Tag</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Operator</label>
              <select value={cfg.operator || 'is_true'} onChange={e => onChange('operator', e.target.value)} className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none">
                <option value="is_true">Is True / Yes</option>
                <option value="is_false">Is False / No</option>
                <option value="equals">Equals (=)</option>
                <option value="not_equals">Not Equals (≠)</option>
                <option value="greater_than">Greater Than (&gt;)</option>
                <option value="less_than">Less Than (&lt;)</option>
                <option value="contains">Contains</option>
              </select>
            </div>
            {['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'tag'].includes(cfg.operator || '') && (
              <div>
                <label className="block text-[11px] font-bold text-[#706B61] mb-1">Value</label>
                <input type="text" value={cfg.value || ''} onChange={e => onChange('value', e.target.value)} placeholder="45" className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
              </div>
            )}
            <p className="text-[10px] text-[#9E968D]">Connect the <span className="text-green-600 font-bold">YES</span> handle to the next step if true, and the <span className="text-red-500 font-bold">NO</span> handle if false.</p>
          </>
        )}

        {/* DELAY */}
        {type === 'timing_delay' && (
          <div className="space-y-3">
            <p className="text-[11px] text-[#706B61]">Wait this long before the next step runs:</p>
            {[['days', 'Days'], ['hours', 'Hours'], ['minutes', 'Minutes']].map(([key, lbl]) => (
              <div key={key}>
                <label className="block text-[11px] font-bold text-[#706B61] mb-1">{lbl}</label>
                <input type="number" min={0} value={cfg[key] || 0} onChange={e => onChange(key, parseInt(e.target.value) || 0)} className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-sky-400" />
              </div>
            ))}
          </div>
        )}

        {/* ADD TAG */}
        {type === 'add_tag' && (
          <div>
            <label className="block text-[11px] font-bold text-[#706B61] mb-1">Tag Name</label>
            <input type="text" value={cfg.tag || ''} onChange={e => onChange('tag', e.target.value)} placeholder="vip-client" className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
            <p className="text-[10px] text-[#9E968D] mt-1">Adds this tag to the contact's profile when reached.</p>
          </div>
        )}

        {/* API */}
        {type === 'integration_api' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">URL</label>
              <input type="text" value={cfg.url || ''} onChange={e => onChange('url', e.target.value)} placeholder="https://api.example.com/hook" className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#706B61] mb-1">Method</label>
              <select value={cfg.method || 'POST'} onChange={e => onChange('method', e.target.value)} className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Delete button */}
      <div className="px-4 py-3 border-t border-[#E5DED2] shrink-0">
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Node
        </button>
      </div>
    </div>
  );
}

// ─── FlowCanvas Main Component ───────────────────────────────────────────────

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

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge({
      ...params,
      animated: false,
      style: { stroke: '#B08D57', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#B08D57' }
    }, eds)),
    [setEdges]
  );

  const handleNodeClick = (_: any, node: Node) => setSelectedNode(node);
  const handlePaneClick = () => setSelectedNode(null);

  const handleAddNode = (type: string, label: string, defaultConfig: any) => {
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      position: { x: 200 + Math.random() * 200, y: 200 + nodes.length * 120 },
      data: {
        label,
        node_type: type,
        config: { ...defaultConfig }
      }
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
        setSelectedNode(updated);
        return updated;
      }
      const updated = { ...n, data: { ...n.data, config: { ...(n.data.config as any), [key]: value } } };
      setSelectedNode(updated);
      return updated;
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
    const flowDef: FlowDefinition = { nodes: nodes as any[], edges: edges as any[] };
    onSave(flowDef);
    setTimeout(() => setSaving(false), 800);
  };

  return (
    <div className="flex h-full w-full bg-[#F8F5EF] relative overflow-hidden">

      {/* LEFT: Node Library */}
      <div className="w-60 border-r border-[#E5DED2] bg-white flex flex-col shrink-0 overflow-y-auto z-10">
        {/* Header */}
        <div className="p-3 border-b border-[#E5DED2] shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black text-[#292722] truncate max-w-[140px]">{flowName}</span>
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={handleSave} isLoading={saving} leftIcon={<Save className="w-3 h-3" />} className="!text-xs !py-1 !px-2">
                {saving ? 'Saving...' : 'Save'}
              </Button>
              {onClose && (
                <button onClick={onClose} className="p-1.5 rounded-lg text-[#706B61] hover:bg-[#F1ECE3] hover:text-[#292722]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-[#9E968D]">Drag nodes from below onto the canvas →</p>
        </div>

        {/* Node sections */}
        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NODE_LIBRARY.map(section => (
            <div key={section.section}>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#9E968D] px-2 pt-3 pb-1">{section.section}</p>
              {section.items.map(item => {
                const style = NODE_STYLES[item.type] || NODE_STYLES.message_text;
                const Icon = style.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => handleAddNode(item.type, item.label, item.defaultConfig)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#F8F5EF] border border-transparent hover:border-[#E5DED2] text-left transition-all group"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: style.border + '22' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: style.color }} />
                    </div>
                    <span className="text-xs font-bold text-[#292722] leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: Canvas */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#E5DED2" />
          <Controls className="bg-white border border-[#E5DED2] rounded-xl shadow-sm" />
          <MiniMap
            className="border border-[#E5DED2] rounded-xl shadow-sm"
            nodeColor={n => {
              const style = NODE_STYLES[(n.data as any).node_type];
              return style?.border || '#E5DED2';
            }}
          />
        </ReactFlow>

        {/* Empty canvas hint */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center p-8 rounded-2xl bg-white/80 border-2 border-dashed border-[#E5DED2]">
              <Sparkles className="w-8 h-8 text-[#B08D57] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#292722]">Canvas is empty</p>
              <p className="text-xs text-[#706B61] mt-1">Click a node from the left panel to add it</p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Properties Panel */}
      {selectedNode && (
        <PropertiesPanel
          node={selectedNode}
          onChange={handleConfigChange}
          onDelete={handleDeleteNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
