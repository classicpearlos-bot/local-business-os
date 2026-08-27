'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { 
  Key, 
  Webhook, 
  Plus, 
  FileCode2, 
  Copy, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw,
  Terminal,
  Code2,
  Lock
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DevelopersPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [keySaving, setKeySaving] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<'curl' | 'node' | 'python'>('curl');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, whRes] = await Promise.all([
        supabase.from('api_keys').select('*').order('created_at', { ascending: false }),
        supabase.from('tenant_webhooks').select('*').order('created_at', { ascending: false })
      ]);

      if (keysRes.data) setApiKeys(keysRes.data);
      if (whRes.data) setWebhooks(whRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeySaving(true);
    setKeyError('');

    try {
      const res = await fetch('/api/developers/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName })
      });

      const data = await res.json();
      if (!res.ok) {
        setKeyError(data.error || 'Failed to generate key');
        return;
      }

      setCreatedRawKey(data.rawKey);
      fetchData();
    } catch (err: any) {
      setKeyError('Network error. Failed to generate key.');
    } finally {
      setKeySaving(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Revoking this API key will immediately invalidate all external API calls using it.')) return;

    try {
      const res = await fetch('/api/developers/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getCodeSnippet = () => {
    if (selectedSnippet === 'curl') {
      return `curl -X POST https://your-domain.com/api/v1/send \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Idempotency-Key: ${Date.now()}-uuid" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+919876543210",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": { "code": "en_US" }
    }
  }'`;
    } else if (selectedSnippet === 'node') {
      return `const res = await fetch('https://your-domain.com/api/v1/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_your_api_key',
    'Idempotency-Key': crypto.randomUUID(),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: '+919876543210',
    type: 'text',
    text: { body: 'Hello from NexChat API!' }
  })
});

const data = await res.json();
console.log(data);`;
    } else {
      return `import requests
import uuid

url = "https://your-domain.com/api/v1/send"
headers = {
    "Authorization": "Bearer sk_live_your_api_key",
    "Idempotency-Key": str(uuid.uuid4()),
    "Content-Type": "application/json"
}
payload = {
    "to": "+919876543210",
    "type": "text",
    "text": {"body": "Hello from Python SDK!"}
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F3EA]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Developers & API Gateway"
          subtitle="Programmatic WhatsApp Cloud API endpoints, idempotency keys, and tenant webhooks."
          badge={<Badge variant="primary">v1 REST API</Badge>}
          actions={
            <Button
              onClick={() => { setKeyName(''); setCreatedRawKey(null); setKeyError(''); setShowKeyModal(true); }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Generate API Key
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-8 max-w-6xl">
          {/* API Keys Table Card */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle>API Access Keys</CardTitle>
                <CardDescription>
                  Keys are stored as SHA-256 hashes and authenticated via <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">Bearer</code> token.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              >
                Refresh
              </Button>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#FAF7F2]/70 border-b border-[#EFE3CF] text-[#9E968D] font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Key Name</th>
                    <th className="px-6 py-4">Token Prefix</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4 text-right">Revoke</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-600">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-white text-sm">
                        {key.name}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">
                        <span className="px-2 py-1 rounded bg-slate-100 border border-[#EFE3CF]">
                          {key.key_prefix}••••••••
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {key.revoked_at ? (
                          <Badge variant="danger" dot>Revoked</Badge>
                        ) : (
                          <Badge variant="success" dot>Active</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#7C756D]">
                        {new Date(key.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!!key.revoked_at}
                          onClick={() => handleRevokeKey(key.id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {apiKeys.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          icon={Key}
                          title="No API keys generated"
                          description="Generate a secure API key to start dispatching WhatsApp messages from your external applications."
                          actionLabel="Generate Key"
                          onAction={() => { setKeyName(''); setCreatedRawKey(null); setKeyError(''); setShowKeyModal(true); }}
                          actionIcon={<Plus className="w-4 h-4" />}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Interactive Code Playground */}
          <div className="bg-[#0B0F17] rounded-2xl p-6 sm:p-8 text-white border border-[#EFE3CF] shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Interactive Endpoint Reference</h3>
                  <p className="text-xs text-[#7C756D] font-medium mt-0.5">
                    <span className="text-emerald-400 font-mono font-bold">POST</span> /api/v1/send with Idempotency Protection
                  </p>
                </div>
              </div>

              {/* Language Switcher */}
              <div className="flex bg-[#F2ECE0] p-1 rounded-xl border border-[#EFE3CF]">
                {(['curl', 'node', 'python'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedSnippet(lang)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all uppercase cursor-pointer ${
                      selectedSnippet === lang
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-[#7C756D] hover:text-[#2C2723]'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative bg-black/60 rounded-xl p-4 border border-[#EFE3CF] font-mono text-xs text-[#5D564E] overflow-x-auto">
              <pre className="leading-relaxed whitespace-pre-wrap">{getCodeSnippet()}</pre>
            </div>
          </div>
        </main>
      </div>

      {/* Create Key Modal */}
      <Modal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        title={createdRawKey ? "API Key Generated" : "Generate Developer API Key"}
        description="Keys allow programmatic access to the /api/v1/send endpoint."
      >
        {createdRawKey ? (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
              Copy this API secret key now. For your security, it will NEVER be displayed again.
            </div>

            <div className="p-3.5 bg-[#F2ECE0] text-white rounded-xl font-mono text-xs flex items-center justify-between gap-3 break-all border border-[#EFE3CF]">
              <span>{createdRawKey}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(createdRawKey)}
                leftIcon={copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#7C756D]" />}
                className="bg-slate-800 text-[#2C2723] border-[#DFBE7E]/60 hover:bg-slate-700 shrink-0"
              >
                {copiedKey ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowKeyModal(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateKey} className="space-y-4">
            {keyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {keyError}
              </div>
            )}

            <Input
              label="Key Identifier Name *"
              placeholder="e.g. Production Backend Server, Zapier Hook"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              helperText="Give this token a recognizable name to track usage."
              required
            />

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#EFE3CF]">
              <Button variant="outline" size="sm" type="button" onClick={() => setShowKeyModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={keySaving}>
                Generate Token
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
