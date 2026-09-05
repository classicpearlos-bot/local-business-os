'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import {
  Search, RefreshCw, FileText,
  Eye, Plus, X, Phone, Globe, MessageSquare, Upload, Loader2, Image as ImageIcon
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from 'react-hot-toast';
import { useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

type HeaderType = 'NONE' | 'TEXT' | 'IMAGE';
type ButtonType = 'PHONE_NUMBER' | 'URL' | 'QUICK_REPLY';

interface TemplateButton {
  type: ButtonType;
  text: string;
  phone_number?: string;
  url?: string;
}

// ─── Image Uploader ─────────────────────────────────────────────────────────

function ImageUploader({ value, onChange }: { value: string; onChange: (url: string, handle?: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5MB.'); return; }
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/media/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (json.url) {
        onChange(json.url, json.meta_handle);
      } else {
        setError(json.error || 'Upload failed.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative rounded-xl overflow-hidden border border-[#E5DED2]" style={{ height: 100 }}>
          <img src={value} alt="header" className="w-full h-full object-cover" />
          <button onClick={() => onChange('', undefined)}
            className="absolute top-1 right-1 p-0.5 bg-black/50 rounded-full text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-[#B08D57] text-[#B08D57] hover:bg-[#B08D57]/10 text-xs font-bold transition-all disabled:opacity-50"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? 'Uploading…' : value ? 'Replace Image' : 'Upload Header Image'}
      </button>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder="or paste an image URL…"
        className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  );
}

// ─── Live WhatsApp Preview ───────────────────────────────────────────────────

function LivePreview({ headerType, headerText, headerImageUrl, bodyText, buttons }: {
  headerType: HeaderType;
  headerText: string;
  headerImageUrl: string;
  bodyText: string;
  buttons: TemplateButton[];
}) {
  const hasContent = headerText || headerImageUrl || bodyText || buttons.length > 0;
  return (
    <div className="flex flex-col items-center justify-start pt-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#9E968D] mb-3">Live Preview</p>
      <div className="w-full max-w-[260px] rounded-2xl overflow-hidden shadow-lg border border-[#E5DED2] bg-white">
        {/* WhatsApp header bar */}
        <div className="bg-[#075E54] px-3 py-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center text-white text-[9px] font-black">CP</div>
          <div>
            <p className="text-white text-[10px] font-bold">Classic Pearl Salon</p>
            <p className="text-[#B2DFDB] text-[8px]">Business Account</p>
          </div>
        </div>
        <div className="bg-[#ECE5DD] p-3">
          {!hasContent ? (
            <div className="text-center py-6">
              <MessageSquare className="w-8 h-8 text-[#C5B8A8] mx-auto mb-2" />
              <p className="text-[10px] text-[#9E968D]">Your template preview will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              {/* Image header */}
              {headerType === 'IMAGE' && headerImageUrl && (
                <img src={headerImageUrl} alt="header" className="w-full object-cover" style={{ maxHeight: 120 }} />
              )}
              {headerType === 'IMAGE' && !headerImageUrl && (
                <div className="bg-[#F0EBE3] h-24 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-[#C5B8A8]" />
                </div>
              )}
              <div className="p-3 space-y-2">
                {/* Text header */}
                {headerType === 'TEXT' && headerText && (
                  <p className="text-[11px] font-black text-[#1E1B18]">{headerText}</p>
                )}
                {/* Body */}
                {bodyText && (
                  <p className="text-[11px] text-[#1E1B18] leading-relaxed whitespace-pre-wrap">{bodyText}</p>
                )}
                <div className="flex justify-end">
                  <span className="text-[8px] text-[#9E968D]">13:17 ✓✓</span>
                </div>
              </div>
              {/* Buttons */}
              {buttons.length > 0 && (
                <div className="border-t border-[#E5DED2]">
                  {buttons.map((btn, i) => (
                    <div key={i} className={`flex items-center justify-center gap-1.5 py-2 text-[#0a85c2] text-[11px] font-bold ${
                      i < buttons.length - 1 ? 'border-b border-[#E5DED2]' : ''
                    }`}>
                      {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3" />}
                      {btn.type === 'URL' && <Globe className="w-3 h-3" />}
                      {btn.type === 'QUICK_REPLY' && <MessageSquare className="w-3 h-3" />}
                      <span>{btn.text || (btn.type === 'PHONE_NUMBER' ? 'Call Us' : btn.type === 'URL' ? 'Visit Website' : 'Quick Reply')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Button Editor ───────────────────────────────────────────────────────────

function ButtonEditor({ buttons, onChange }: { buttons: TemplateButton[]; onChange: (b: TemplateButton[]) => void }) {
  const add = (type: ButtonType) => {
    if (buttons.length >= 3) return;
    const defaults: Record<ButtonType, TemplateButton> = {
      PHONE_NUMBER: { type: 'PHONE_NUMBER', text: 'Call Us', phone_number: '' },
      URL: { type: 'URL', text: 'Visit Website', url: '' },
      QUICK_REPLY: { type: 'QUICK_REPLY', text: 'WhatsApp' },
    };
    onChange([...buttons, defaults[type]]);
  };

  const update = (i: number, key: string, val: string) => {
    const next = [...buttons];
    (next[i] as any)[key] = val;
    onChange(next);
  };

  const remove = (i: number) => onChange(buttons.filter((_, idx) => idx !== i));

  const typeLabel: Record<ButtonType, string> = {
    PHONE_NUMBER: '📞 Call',
    URL: '🔗 Link',
    QUICK_REPLY: '💬 Reply',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#3E2D12]">Buttons <span className="font-normal text-[#9E968D]">(max 3)</span></label>
        <span className="text-[10px] text-[#9E968D]">{buttons.length}/3 added</span>
      </div>

      {buttons.map((btn, i) => (
        <div key={i} className="p-3 bg-[#FAF7F2] border border-[#E5DED2] rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#706B61] uppercase tracking-wider">{typeLabel[btn.type]}</span>
            <button onClick={() => remove(i)} className="p-1 hover:bg-red-50 text-[#9E968D] hover:text-red-500 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text" value={btn.text}
            onChange={e => update(i, 'text', e.target.value)}
            placeholder="Button label shown to customer"
            className="w-full px-3 py-2 bg-white border border-[#E5DED2] rounded-lg text-xs text-[#292722] outline-none focus:border-[#B08D57]"
          />
          {btn.type === 'PHONE_NUMBER' && (
            <input type="text" value={btn.phone_number || ''}
              onChange={e => update(i, 'phone_number', e.target.value)}
              placeholder="+91 98765 43210 (with country code)"
              className="w-full px-3 py-2 bg-white border border-[#E5DED2] rounded-lg text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
          )}
          {btn.type === 'URL' && (
            <input type="text" value={btn.url || ''}
              onChange={e => update(i, 'url', e.target.value)}
              placeholder="https://maps.google.com/... or https://youwebsite.com"
              className="w-full px-3 py-2 bg-white border border-[#E5DED2] rounded-lg text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
          )}
        </div>
      ))}

      {buttons.length < 3 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => add('PHONE_NUMBER')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5DED2] bg-white hover:border-[#B08D57] hover:bg-[#FAF7F2] text-[11px] font-bold text-[#706B61] hover:text-[#292722] transition-all">
            <Phone className="w-3 h-3" /> Call Button
          </button>
          <button onClick={() => add('URL')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5DED2] bg-white hover:border-[#B08D57] hover:bg-[#FAF7F2] text-[11px] font-bold text-[#706B61] hover:text-[#292722] transition-all">
            <Globe className="w-3 h-3" /> URL / Directions
          </button>
          <button onClick={() => add('QUICK_REPLY')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5DED2] bg-white hover:border-[#B08D57] hover:bg-[#FAF7F2] text-[11px] font-bold text-[#706B61] hover:text-[#292722] transition-all">
            <MessageSquare className="w-3 h-3" /> Quick Reply
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('en_US');
  const [headerType, setHeaderType] = useState<HeaderType>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [headerImageHandle, setHeaderImageHandle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [buttons, setButtons] = useState<TemplateButton[]>([]);

  const resetForm = () => {
    setName('');
    setCategory('MARKETING');
    setLanguage('en_US');
    setHeaderType('NONE');
    setHeaderText('');
    setHeaderImageUrl('');
    setHeaderImageHandle('');
    setBodyText('');
    setButtons([]);
  };

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/templates/local');
      const json = await res.json();
      if (res.ok && json.data) setTemplates(json.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/whatsapp/templates');
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Sync failed'); return; }
      toast.success(`Synced ${data.data?.length || 0} templates from Meta!`);
      fetchTemplates();
    } catch { toast.error('Network error'); }
    finally { setSyncing(false); }
  };

  const validate = (): string | null => {
    if (!name) return 'Template name is required.';
    if (!/^[a-z0-9_]+$/.test(name)) return 'Name must be lowercase letters, numbers and underscores only.';
    if (!bodyText) return 'Body text is required.';
    if (/\*\*.*?\*\*|\*.*?\*|__.*?__|_.*?_/.test(bodyText)) return 'No bold/italic markdown in body — Meta rejects it. Plain text only.';
    for (const btn of buttons) {
      if (!btn.text?.trim()) return 'All buttons must have text.';
      if (btn.type === 'PHONE_NUMBER' && !/^\+\d{7,15}$/.test((btn.phone_number || '').replace(/\s/g, ''))) {
        return `Call button phone number must be international format: +917483654138 (no spaces).`;
      }
      if (btn.type === 'URL' && !/^https?:\/\/.+/.test(btn.url || '')) {
        return 'URL button must have a valid https:// address.';
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setCreating(true);
    try {
      const components: any[] = [];

      // Header
      if (headerType === 'TEXT' && headerText) {
        components.push({ type: 'HEADER', format: 'TEXT', text: headerText });
      } else if (headerType === 'IMAGE') {
        if (headerImageHandle) {
          components.push({ type: 'HEADER', format: 'IMAGE', example: { header_handle: [headerImageHandle] } });
        } else if (headerImageUrl) {
          components.push({ type: 'HEADER', format: 'IMAGE', example: { header_url: [headerImageUrl] } });
        }
      }

      // Body
      components.push({ type: 'BODY', text: bodyText });

      // Buttons
      if (buttons.length > 0) {
        components.push({ type: 'BUTTONS', buttons });
      }

      const res = await fetch('/api/whatsapp/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, language, category, components })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit template');

      toast.success('Template submitted to Meta for approval! It usually takes a few minutes.');
      setIsCreateOpen(false);
      resetForm();
      fetchTemplates();
    } catch (e: any) {
      toast.error(e.message || 'Error submitting template');
    } finally {
      setCreating(false);
    }
  };

  const filtered = templates.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  const getBodyText = (t: any) => {
    const comps = (t.components as any[]) || [];
    return comps.find(c => c.type === 'BODY')?.text || '—';
  };
  const getHeaderType = (t: any) => {
    const comps = (t.components as any[]) || [];
    const h = comps.find(c => c.type === 'HEADER');
    return h ? (h.format || 'TEXT') : 'NONE';
  };
  const getButtons = (t: any) => {
    const comps = (t.components as any[]) || [];
    return comps.find(c => c.type === 'BUTTONS')?.buttons || [];
  };

  return (
    <div className="flex h-screen bg-[#F7F3EA]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Message Templates"
          subtitle="Design, upload and submit WhatsApp templates for Meta approval."
          badge={<Badge variant="primary">{templates.length} Templates</Badge>}
          actions={
            <div className="flex gap-2">
              <Button
                onClick={() => { resetForm(); setIsCreateOpen(true); }}
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Template
              </Button>
              <Button
                onClick={handleSync}
                isLoading={syncing}
                variant="whatsapp"
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Sync from Meta
              </Button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-[#EFE3CF] flex items-center justify-between gap-4 bg-white">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#7C756D]" />
                <input type="text" placeholder="Search templates…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#FAF7F2] border border-[#EFE3CF] rounded-xl text-xs font-medium outline-none" />
              </div>
              <Button variant="outline" size="sm" onClick={fetchTemplates}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>
                Refresh
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#FAF7F2]/70 border-b border-[#EFE3CF] text-[#9E968D] font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Template Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Header</th>
                    <th className="px-6 py-4">Buttons</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE3CF] font-medium text-[#3E2D12]">
                  {loading && (
                    <tr><td colSpan={6} className="text-center py-10 text-sm text-[#9E968D]">Loading templates…</td></tr>
                  )}
                  {!loading && filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[#1E1B18] text-xs">{t.name}</td>
                      <td className="px-6 py-4 text-xs font-bold uppercase text-[#9E968D]">{t.category}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`px-2 py-0.5 rounded-md font-bold ${
                          getHeaderType(t) === 'IMAGE' ? 'bg-orange-50 text-orange-600' :
                          getHeaderType(t) === 'TEXT' ? 'bg-indigo-50 text-indigo-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>{getHeaderType(t)}</span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {getButtons(t).length > 0 ? (
                          <span className="text-[#B08D57] font-bold">{getButtons(t).length} button{getButtons(t).length > 1 ? 's' : ''}</span>
                        ) : <span className="text-[#9E968D]">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={t.status === 'APPROVED' ? 'success' : t.status === 'REJECTED' ? 'danger' : 'warning'} dot>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(t)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}>Preview</Button>
                      </td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={6}>
                      <EmptyState icon={FileText} title="No templates found"
                        description="Create your first template to start sending WhatsApp campaigns."
                        actionLabel="Create Template"
                        onAction={() => { resetForm(); setIsCreateOpen(true); }}
                        actionIcon={<Plus className="w-4 h-4" />} />
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>

      {/* ── Preview Modal ── */}
      {previewTemplate && (
        <Modal isOpen={!!previewTemplate} onClose={() => setPreviewTemplate(null)}
          title={`Preview: ${previewTemplate.name}`}
          description={`Status: ${previewTemplate.status} • Category: ${previewTemplate.category}`}>
          <div className="space-y-4">
            <LivePreview
              headerType={getHeaderType(previewTemplate) as HeaderType}
              headerText={''}
              headerImageUrl={''}
              bodyText={getBodyText(previewTemplate)}
              buttons={getButtons(previewTemplate)}
            />
            {getBodyText(previewTemplate) !== '—' && (
              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E5DED2]">
                <p className="text-[10px] font-black text-[#9E968D] uppercase tracking-wider mb-1">Body Text</p>
                <p className="text-xs text-[#292722] whitespace-pre-wrap">{getBodyText(previewTemplate)}</p>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Create Template Modal ── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !creating && setIsCreateOpen(false)}
        size="xl"
        title="Create New WhatsApp Template"
        description="Fill in the details below, then submit to Meta for approval (usually 2–5 minutes)."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT: Form */}
          <div className="space-y-5 overflow-y-auto max-h-[70vh] pr-1">

            {/* Name + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#3E2D12] mb-1.5">Template Name *</label>
                <input type="text"
                  value={name}
                  onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder="e.g. weekday_offer"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DED2] rounded-xl text-xs font-mono text-[#292722] outline-none focus:border-[#B08D57]" />
                <p className="text-[9px] text-[#9E968D] mt-1">Lowercase, numbers, underscores only</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3E2D12] mb-1.5">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none">
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                </select>
              </div>
            </div>

            {/* Header */}
            <div>
              <label className="block text-xs font-bold text-[#3E2D12] mb-1.5">Header (optional)</label>
              <div className="flex gap-2 mb-3">
                {(['NONE','TEXT','IMAGE'] as HeaderType[]).map(t => (
                  <button key={t} onClick={() => setHeaderType(t)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      headerType === t
                        ? 'bg-[#B08D57] text-white border-[#B08D57]'
                        : 'bg-white text-[#706B61] border-[#E5DED2] hover:border-[#B08D57]'
                    }`}>
                    {t === 'NONE' ? 'No Header' : t === 'TEXT' ? 'Text Header' : '📷 Image Header'}
                  </button>
                ))}
              </div>
              {headerType === 'TEXT' && (
                <input type="text" value={headerText} onChange={e => setHeaderText(e.target.value)}
                  placeholder="Header title (max 60 chars)" maxLength={60}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]" />
              )}
              {headerType === 'IMAGE' && (
                <ImageUploader
                  value={headerImageUrl}
                  onChange={(url, handle) => {
                    setHeaderImageUrl(url);
                    setHeaderImageHandle(handle || '');
                  }}
                />
              )}
            </div>

            {/* Body Text */}
            <div>
              <label className="block text-xs font-bold text-[#3E2D12] mb-1.5">Message Body *</label>
              <textarea rows={5} value={bodyText} onChange={e => setBodyText(e.target.value)}
                placeholder={`Hi, check out our exclusive weekday offers at Classic Pearl Salon!\n\nPremium hair, skin & grooming at special prices.\nCall: +91 83103 30322`}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57] resize-none" />
              <div className="flex justify-between mt-1">
                <p className="text-[9px] text-amber-600 font-semibold">⚠️ Plain text only — no **bold** or *italic* (Meta rejects it)</p>
                <p className="text-[9px] text-[#9E968D]">{bodyText.length} chars</p>
              </div>
            </div>

            {/* Buttons */}
            <ButtonEditor buttons={buttons} onChange={setButtons} />

            {/* Submit */}
            <div className="pt-2 border-t border-[#E5DED2] flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={creating}>Cancel</Button>
              <Button variant="primary" onClick={handleSubmit} isLoading={creating}>
                Submit to Meta for Approval
              </Button>
            </div>
          </div>

          {/* RIGHT: Live Preview */}
          <div className="hidden lg:block border-l border-[#E5DED2] pl-6">
            <LivePreview
              headerType={headerType}
              headerText={headerText}
              headerImageUrl={headerImageUrl}
              bodyText={bodyText}
              buttons={buttons}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
