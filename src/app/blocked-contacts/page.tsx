'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ShieldAlert,
  UserX,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Trash2,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatISTTime } from '@/lib/meta/dailyLimitResume';

interface BlockedContact {
  id: string;
  organization_id: string;
  phone_number: string;
  name: string;
  blocked_at: string;
  blocked_reason: string;
  blocked_by: string;
  created_at: string;
}

export default function BlockedContactsPage() {
  const [contacts, setContacts] = useState<BlockedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [reasonPreset, setReasonPreset] = useState('Abusive / Inappropriate language');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Unblock confirmation modal state
  const [unblockTarget, setUnblockTarget] = useState<BlockedContact | null>(null);
  const [unblocking, setUnblocking] = useState(false);

  const fetchBlocked = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/blocked-contacts');
      const data = await res.json();
      if (res.ok && data.data) {
        setContacts(data.data);
      }
    } catch (err) {
      console.error('Failed to load blocked contacts:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) {
      toast.error('Please enter a phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const finalReason = reasonPreset === 'Custom' ? customReason.trim() || 'Blocked by admin' : reasonPreset;
      const res = await fetch('/api/blocked-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneInput.trim(),
          name: nameInput.trim() || undefined,
          reason: finalReason,
          source: 'admin'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to block contact');
      }

      toast.success(`Successfully blocked ${phoneInput.trim()}!`);
      setIsBlockModalOpen(false);
      setPhoneInput('');
      setNameInput('');
      setCustomReason('');
      setReasonPreset('Abusive / Inappropriate language');
      fetchBlocked(true);
    } catch (err: any) {
      toast.error(err.message || 'Error blocking contact');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblockConfirm = async () => {
    if (!unblockTarget) return;
    setUnblocking(true);
    try {
      const res = await fetch(`/api/blocked-contacts?id=${unblockTarget.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to unblock contact');
      }

      toast.success(`Unblocked ${unblockTarget.phone_number}. Contact can now receive messages.`);
      setUnblockTarget(null);
      fetchBlocked(true);
    } catch (err: any) {
      toast.error(err.message || 'Error unblocking contact');
    } finally {
      setUnblocking(false);
    }
  };

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const phone = (c.phone_number || '').toLowerCase();
    const name = (c.name || '').toLowerCase();
    const reason = (c.blocked_reason || '').toLowerCase();
    return phone.includes(q) || name.includes(q) || reason.includes(q);
  });

  return (
    <div className="flex h-screen bg-[#F8F5EF] text-[#292722]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Blocked Contacts"
          subtitle="Restricted phone numbers are 100% excluded from campaigns, Excel broadcasts, and AI bot replies."
          badge={<Badge variant="danger">{contacts.length} Blocked</Badge>}
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchBlocked()}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsBlockModalOpen(true)}
                leftIcon={<UserX className="w-4 h-4" />}
                className="bg-rose-600 hover:bg-rose-700 text-white border-rose-700"
              >
                Block a Number
              </Button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* Security & Campaign Guardrail Callout */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300/80 shadow-2xs flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 text-amber-900" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Autonomous Broadcast Exclusion Active
              </h4>
              <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                Any phone number listed here is automatically detected and skipped whenever you launch WhatsApp campaigns — even if the number appears in uploaded Excel files or contact lists. AI automated responses and bot triggers are also completely suppressed for blocked contacts.
              </p>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <Card className="overflow-hidden border border-[#E5DED2] bg-white shadow-sm">
            <div className="p-4 border-b border-[#E5DED2] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FCFAF6]">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#9E968D]" />
                <input
                  type="text"
                  placeholder="Search by phone number, name, or reason..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5DED2] rounded-xl text-xs font-medium outline-none focus:border-[#B08D57] transition-all"
                />
              </div>

              <div className="text-xs text-[#706B61] font-semibold">
                Showing <strong>{filtered.length}</strong> of {contacts.length} blocked numbers
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#FAF7F2] border-b border-[#E5DED2] text-[#9E968D] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3.5">Contact / Phone</th>
                    <th className="px-6 py-3.5">Block Reason</th>
                    <th className="px-6 py-3.5">Blocked Date (IST)</th>
                    <th className="px-6 py-3.5">Source</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DED2] font-medium text-[#292722]">
                  {loading && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-[#9E968D]">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#B08D57]" />
                        Loading blocked contacts...
                      </td>
                    </tr>
                  )}

                  {!loading && filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                      {/* Name & Phone */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                            <UserX className="w-4 h-4 text-rose-600" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#1E1B18]">{c.name}</p>
                            <p className="font-mono text-xs text-[#706B61] flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-[#B08D57]" />
                              {c.phone_number}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-[11px] font-semibold border border-rose-200/80 inline-block max-w-xs truncate">
                          {c.blocked_reason}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 font-medium text-xs text-[#706B61]">
                        {formatISTTime(c.blocked_at || c.created_at)}
                      </td>

                      {/* Source */}
                      <td className="px-6 py-4 text-xs font-semibold text-[#706B61] capitalize">
                        {c.blocked_by === 'inbox' ? (
                          <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            Inbox 3-Dots
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Admin Direct
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300">
                          🚫 Blocked
                        </span>
                      </td>

                      {/* Action (Unblock only here) */}
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUnblockTarget(c)}
                          leftIcon={<Unlock className="w-3.5 h-3.5 text-emerald-600" />}
                          className="hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 text-xs"
                        >
                          Unblock
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          icon={ShieldAlert}
                          title={search ? 'No matching blocked contacts' : 'No blocked contacts'}
                          description={
                            search
                              ? 'Try adjusting your search criteria.'
                              : 'Your blocklist is empty. Unwanted numbers can be blocked here or directly from the Inbox 3-dots menu.'
                          }
                          actionLabel={search ? undefined : 'Block a Number'}
                          onAction={search ? undefined : () => setIsBlockModalOpen(true)}
                          actionIcon={<UserX className="w-4 h-4" />}
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

      {/* ── Block Contact Modal ── */}
      <Modal
        isOpen={isBlockModalOpen}
        onClose={() => !submitting && setIsBlockModalOpen(false)}
        title="Block a Contact / Phone Number"
        description="Blocked numbers are permanently omitted from campaigns, Excel uploads, and AI auto-replies."
      >
        <form onSubmit={handleBlockSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#3E2D12] mb-1.5">
              Phone Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. +91 98765 43210 or 9876543210"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E5DED2] rounded-xl text-xs font-mono text-[#292722] outline-none focus:border-rose-500"
            />
            <p className="text-[10px] text-[#9E968D] mt-1">
              Supports 10-digit Indian numbers or full international format with country code.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#3E2D12] mb-1.5">
              Client Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Disgruntled Client"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#3E2D12] mb-1.5">
              Reason for Blocking
            </label>
            <select
              value={reasonPreset}
              onChange={e => setReasonPreset(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]"
            >
              <option value="Abusive / Inappropriate language">Abusive / Inappropriate language</option>
              <option value="Spam / Unsolicited messages">Spam / Unsolicited messages</option>
              <option value="Customer explicitly requested no contact">Customer requested no contact</option>
              <option value="Fraudulent / Fake inquiries">Fraudulent / Fake inquiries</option>
              <option value="Custom">Custom Reason...</option>
            </select>
          </div>

          {reasonPreset === 'Custom' && (
            <div>
              <label className="block text-xs font-bold text-[#3E2D12] mb-1.5">
                Specify Reason
              </label>
              <textarea
                rows={2}
                placeholder="Enter details about why this contact is being blocked..."
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57] resize-none"
              />
            </div>
          )}

          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-[11px] text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              <strong>Guaranteed Protection:</strong> Once blocked, our campaign engine will never send messages to this number, even if it is uploaded in future Excel broadcast sheets.
            </span>
          </div>

          <div className="pt-3 border-t border-[#E5DED2] flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBlockModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white border-rose-700"
            >
              Confirm & Block Number
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Unblock Confirmation Modal ── */}
      {unblockTarget && (
        <Modal
          isOpen={!!unblockTarget}
          onClose={() => !unblocking && setUnblockTarget(null)}
          title="Unblock Contact?"
          description={`Are you sure you want to unblock ${unblockTarget.name} (${unblockTarget.phone_number})?`}
        >
          <div className="space-y-4">
            <p className="text-xs text-[#706B61] leading-relaxed">
              Unblocking will restore this contact&apos;s eligibility. They will once again be able to receive marketing broadcasts and interact with the automated AI salon assistant.
            </p>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Contact can be blocked again anytime if needed.</span>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnblockTarget(null)}
                disabled={unblocking}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUnblockConfirm}
                isLoading={unblocking}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
              >
                Yes, Unblock Contact
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
