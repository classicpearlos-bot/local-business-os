'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { 
  Phone, 
  CheckCircle2, 
  Key, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Server,
  Lock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function WhatsAppSettings() {
  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/whatsapp/account');
        if (res.ok) {
          const data = await res.json();
          if (data.account) {
            setWabaId(data.account.waba_id || '');
            setPhoneNumberId(data.account.phone_number_id || '');
            setVerifyToken(data.account.webhook_verify_token || '');
          } else {
            setVerifyToken('nx_verify_' + Math.random().toString(36).substring(2, 10));
          }
        }
      } catch (e) {
        console.error('Failed to load WhatsApp settings', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/whatsapp/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waba_id: wabaId.trim(),
          phone_number_id: phoneNumberId.trim(),
          access_token: accessToken.trim(),
          webhook_verify_token: verifyToken
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to save WhatsApp settings.' });
        return;
      }

      setStatusMsg({ type: 'success', text: 'Meta WhatsApp Cloud API credentials securely saved on the server.' });
      setAccessToken('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to connect to server.' });
    } finally {
      setSaving(false);
    }
  };

  const copyText = (field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isConnected = !!phoneNumberId && !!wabaId;
  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/whatsapp/webhook`
    : 'https://your-domain.com/api/whatsapp/webhook';

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Meta WhatsApp Cloud API"
          subtitle="Direct integration with official Meta Graph API v19.0 (Zero BSP middleman dependency)."
          badge={
            isConnected ? (
              <Badge variant="success" dot pulse>Connected</Badge>
            ) : (
              <Badge variant="warning" dot>Disconnected</Badge>
            )
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-8 max-w-5xl">
          {statusMsg && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-semibold ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <p>{statusMsg.text}</p>
            </div>
          )}

          {/* Credentials Form Card */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Meta Cloud API Credentials</CardTitle>
                <CardDescription>
                  Enter credentials from your Meta Developer App & WhatsApp Business Account.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Lock className="w-3.5 h-3.5" />
                Server-Side Encrypted
              </div>
            </CardHeader>

            <form onSubmit={handleSave}>
              <CardContent className="space-y-5">
                <Input
                  label="WhatsApp Business Account ID (WABA ID) *"
                  placeholder="e.g. 109283746554321"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  helperText="Located in Meta Business Manager under WhatsApp Accounts."
                  required
                />

                <Input
                  label="Phone Number ID *"
                  placeholder="e.g. 987654321098765"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  helperText="Located in Meta Developer App > WhatsApp > API Setup."
                  required
                />

                <Input
                  label="Permanent System User Access Token *"
                  type="password"
                  placeholder={isConnected ? "•••••••••••••••••••••••• (Leave blank to keep current)" : "EAAG••••••••••••••••••••"}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  helperText="Requires 'whatsapp_business_messaging' and 'whatsapp_business_management' permissions."
                  required={!isConnected}
                />
              </CardContent>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium">
                  Credentials are strictly bound to your organization workspace via RLS.
                </p>
                <Button variant="whatsapp" type="submit" isLoading={saving} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                  Save & Connect
                </Button>
              </div>
            </form>
          </Card>

          {/* Webhook Configuration Station */}
          <div className="bg-[#0B0F17] rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Meta Webhook Configuration</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Paste these values into Meta Developer App to receive real-time messages and delivery status ticks.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Callback URL</p>
                  <p className="font-mono text-xs text-slate-200 mt-1 break-all">{webhookUrl}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText('url', webhookUrl)}
                  leftIcon={copiedField === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 shrink-0"
                >
                  {copiedField === 'url' ? 'Copied' : 'Copy URL'}
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Verify Token</p>
                  <p className="font-mono text-xs text-slate-200 mt-1">{verifyToken || 'nx_verify_token'}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText('token', verifyToken || 'nx_verify_token')}
                  leftIcon={copiedField === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 shrink-0"
                >
                  {copiedField === 'token' ? 'Copied' : 'Copy Token'}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
