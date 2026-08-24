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
  ShieldCheck,
  Plus,
  X
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { WhatsAppPreview } from "@/components/ui/WhatsAppPreview";
import { MediaUploader, MediaUploadValue } from "@/components/ui/MediaUploader";
import { toast } from 'react-hot-toast';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  
  // Create Template State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('MARKETING');
  const [newLanguage, setNewLanguage] = useState('en_US');
  const [newHeaderType, setNewHeaderType] = useState<'NONE'|'TEXT'|'IMAGE'>('NONE');
  const [newHeaderText, setNewHeaderText] = useState('');
  const [newMediaValue, setNewMediaValue] = useState<MediaUploadValue | null>(null);
  const [newBodyText, setNewBodyText] = useState('');
  
  // Buttons
  const [newButtons, setNewButtons] = useState<any[]>([]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/templates/local');
      const json = await res.json();
      if (res.ok && json.data) {
        setTemplates(json.data);
      }
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
    try {
      const res = await fetch('/api/whatsapp/templates');
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to sync templates.');
        return;
      }
      toast.success(`Successfully synced ${data.data?.length || 0} template(s) from Meta!`);
      fetchTemplates();
    } catch (err: any) {
      toast.error('Network error connecting to template sync endpoint.');
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

  const handleAddButton = (type: string) => {
    if (newButtons.length >= 2) {
      toast.error("Meta allows a maximum of 2 buttons per template.");
      return;
    }
    
    if (type === 'PHONE_NUMBER') {
      setNewButtons([...newButtons, { type: 'PHONE_NUMBER', text: 'Call Us', phone_number: '+1234567890' }]);
    } else if (type === 'URL') {
      setNewButtons([...newButtons, { type: 'URL', text: 'Visit Website', url: 'https://example.com' }]);
    } else if (type === 'QUICK_REPLY') {
      setNewButtons([...newButtons, { type: 'QUICK_REPLY', text: 'WhatsApp' }]);
    }
  };

  const updateButton = (index: number, key: string, value: string) => {
    const updated = [...newButtons];
    updated[index][key] = value;
    setNewButtons(updated);
  };

  const removeButton = (index: number) => {
    setNewButtons(newButtons.filter((_, i) => i !== index));
  };

  const handleSubmitTemplate = async () => {
    if (!newName || !newBodyText) {
      toast.error('Name and Body text are required.');
      return;
    }
    if (newHeaderType === 'IMAGE' && !newMediaValue?.handle) {
      toast.error('Please upload an image and wait for it to finish uploading to Meta.');
      return;
    }

    // Validate: name must be lowercase + underscores only
    const cleanName = newName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (cleanName !== newName) {
      toast.error(`Template name auto-corrected to "${cleanName}". Only lowercase letters, numbers and underscores allowed.`);
      setNewName(cleanName);
      return;
    }

    // Validate: body text must NOT have markdown (**bold**, *italic*, etc.)
    if (/\*\*.*?\*\*|\*.*?\*|__.*?__|_.*?_/.test(newBodyText)) {
      toast.error('Body text cannot have **bold** or *italic* markdown. Meta does not support formatting — just plain text.');
      return;
    }

    // Validate: Call buttons must have a valid phone number
    for (const btn of newButtons) {
      if (btn.type === 'PHONE_NUMBER') {
        if (!btn.phone_number || !/^\+\d{7,15}$/.test(btn.phone_number.trim())) {
          toast.error(`Call button phone number must be in international format (e.g. +917483654138). No spaces or dashes.`);
          return;
        }
      }
      if (btn.type === 'URL') {
        if (!btn.url || !/^https?:\/\/.+/.test(btn.url.trim())) {
          toast.error('URL button must have a valid https:// URL.');
          return;
        }
      }
      if (!btn.text || btn.text.trim().length < 1) {
        toast.error('All buttons must have text.');
        return;
      }
    }
    
    setCreating(true);
    
    try {
      const components: any[] = [];
      
      // Header
      if (newHeaderType === 'TEXT' && newHeaderText) {
        components.push({ type: 'HEADER', format: 'TEXT', text: newHeaderText });
      } else if (newHeaderType === 'IMAGE' && newMediaValue?.handle) {
        components.push({ 
          type: 'HEADER', 
          format: 'IMAGE',
          example: { header_handle: [newMediaValue.handle] }
        });
      }
      
      // Body
      components.push({ type: 'BODY', text: newBodyText });
      
      // Buttons
      if (newButtons.length > 0) {
        components.push({ type: 'BUTTONS', buttons: newButtons });
      }

      const payload = {
        name: newName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        language: newLanguage,
        category: newCategory,
        components
      };

      const res = await fetch('/api/whatsapp/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit template');
      }
      
      toast.success('Template submitted to Meta for approval!');
      setIsCreateOpen(false);
      
      // Reset form
      setNewName('');
      setNewBodyText('');
      setNewMediaValue(null);
      setNewHeaderType('NONE');
      setNewButtons([]);
      
      fetchTemplates();
      
    } catch (err: any) {
      toast.error(err.message || 'Error submitting template');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Message Templates"
          subtitle="Create and manage pre-approved WhatsApp business templates."
          badge={<Badge variant="primary">{templates.length} Templates</Badge>}
          actions={
            <div className="flex gap-2">
              <Button
                onClick={() => setIsCreateOpen(true)}
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Template
              </Button>
              <Button
                onClick={handleSyncFromMeta}
                isLoading={syncing}
                variant="whatsapp"
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Sync
              </Button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-xs text-indigo-950">
                <p className="font-bold text-sm">Create templates directly from NexChat</p>
                <p className="text-slate-600 font-medium mt-0.5 leading-relaxed">
                  You can now create templates with Images and Call/WhatsApp buttons and submit them to Meta for instant approval.
                </p>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-white">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium outline-none"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchTemplates} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>
                Refresh
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Template Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Language</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {filteredTemplates.map((template) => (
                    <tr key={template.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">{template.name}</td>
                      <td className="px-6 py-4 text-xs font-bold uppercase text-slate-500">{template.category}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">{template.language}</td>
                      <td className="px-6 py-4">
                        <Badge variant={template.status === 'APPROVED' ? 'success' : template.status === 'REJECTED' ? 'danger' : 'warning'} dot>
                          {template.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(template)} leftIcon={<Eye className="w-3.5 h-3.5" />}>Preview</Button>
                      </td>
                    </tr>
                  ))}
                  {filteredTemplates.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState icon={FileText} title="No message templates found" description="Create a new template or sync from Meta." actionLabel="Create Template" onAction={() => setIsCreateOpen(true)} actionIcon={<Plus className="w-4 h-4" />} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>

      {/* Preview Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          title={`Template: ${selectedTemplate.name}`}
          description={`Status: ${selectedTemplate.status}`}
        >
          <div className="flex justify-center py-4">
            <WhatsAppPreview
              headerType={getTemplateHeaderInfo(selectedTemplate).type as any}
              bodyText={getTemplateBodyText(selectedTemplate)}
              footerText="Reply STOP to unsubscribe"
              status="read"
            />
          </div>
          <div className="pt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {/* Create Template Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !creating && setIsCreateOpen(false)}
        title="Create New Template"
        description="Design a WhatsApp template and submit it to Meta for approval."
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Template Name</label>
              <input
                type="text"
                placeholder="e.g. summer_promo_01"
                value={newName}
                onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">⚠️ Lowercase, numbers and underscores ONLY — capitals auto-removed</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Category</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs">
                <option value="MARKETING">Marketing (Promotions, offers)</option>
                <option value="UTILITY">Utility (Updates, alerts)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Header (Optional)</label>
            <div className="flex gap-2 mb-3">
              {['NONE', 'TEXT', 'IMAGE'].map(type => (
                <button
                  key={type}
                  onClick={() => setNewHeaderType(type as any)}
                  className={`px-3 py-1 text-xs font-bold rounded-md ${newHeaderType === type ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  {type}
                </button>
              ))}
            </div>
            
            {newHeaderType === 'TEXT' && (
              <input type="text" placeholder="Header text (max 60 chars)" value={newHeaderText} onChange={e => setNewHeaderText(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs" />
            )}
            
            {newHeaderType === 'IMAGE' && (
              <MediaUploader mediaType="image" value={newMediaValue} onChange={setNewMediaValue} required purpose="template" />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Body Text</label>
            <textarea
              placeholder="Hi, check out our latest offers at Classic Pearl Salon! Book now: +917483654138"
              value={newBodyText}
              onChange={(e) => setNewBodyText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs min-h-[100px]"
            />
            <p className="text-[10px] text-amber-600 mt-1 font-semibold">⚠️ Do NOT use **bold**, *italic* or any markdown — Meta rejects it. Plain text only.</p>
            <p className="text-[10px] text-slate-500 mt-0.5">You can use {'{{1}}'} {'{{2}}'} for variable placeholders (e.g. customer name)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Interactive Buttons (Max 2)</label>
            <div className="space-y-3 mb-3">
              {newButtons.map((btn, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border">
                  <span className="text-xs font-bold w-20">{btn.type === 'PHONE_NUMBER' ? 'Call' : btn.type === 'URL' ? 'Link' : 'Reply'}</span>
                  <input type="text" value={btn.text} onChange={e => updateButton(idx, 'text', e.target.value)} placeholder="Button Text" className="px-2 py-1 border rounded text-xs flex-1" />
                  {btn.type === 'PHONE_NUMBER' && <input type="text" value={btn.phone_number} onChange={e => updateButton(idx, 'phone_number', e.target.value)} placeholder="+1234567890" className="px-2 py-1 border rounded text-xs flex-1" />}
                  {btn.type === 'URL' && <input type="text" value={btn.url} onChange={e => updateButton(idx, 'url', e.target.value)} placeholder="https://" className="px-2 py-1 border rounded text-xs flex-1" />}
                  <button onClick={() => removeButton(idx)} className="p-1 hover:bg-rose-100 text-rose-500 rounded"><X className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
            {newButtons.length < 2 && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleAddButton('PHONE_NUMBER')}>+ Call Button</Button>
                <Button size="sm" variant="outline" onClick={() => handleAddButton('URL')}>+ URL Button</Button>
                <Button size="sm" variant="outline" onClick={() => handleAddButton('QUICK_REPLY')}>+ Quick Reply</Button>
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmitTemplate} isLoading={creating}>Submit to Meta</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
