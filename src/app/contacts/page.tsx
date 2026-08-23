'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { 
  Search, 
  Plus, 
  UserCircle2, 
  Phone, 
  MoreHorizontal, 
  RefreshCw, 
  X, 
  Check, 
  AlertCircle,
  Users,
  SlidersHorizontal,
  CheckCircle2,
  ShieldAlert,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { ExcelUploader } from "@/components/ui/ExcelUploader";
import { ExcelParseResult } from "@/utils/excelImport";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'opted_in' | 'opted_out'>('all');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedExcel, setParsedExcel] = useState<ExcelParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [editContact, setEditContact] = useState<any | null>(null);
  const [formData, setFormData] = useState({ name: '', phone_number: '', opted_in: true });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  const fetchContacts = useCallback(async (searchQuery = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: searchQuery, limit: '100' });
      const res = await fetch(`/api/contacts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => fetchContacts(search), 300);
    return () => clearTimeout(debounce);
  }, [search, fetchContacts]);

  const openAdd = () => {
    setFormData({ name: '', phone_number: '', opted_in: true });
    setFormError('');
    setEditContact(null);
    setShowAddModal(true);
  };

  const openEdit = (contact: any) => {
    setFormData({ name: contact.name || '', phone_number: contact.phone_number, opted_in: contact.opted_in });
    setFormError('');
    setEditContact(contact);
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');

    try {
      const method = editContact ? 'PATCH' : 'POST';
      const body = editContact
        ? { id: editContact.id, name: formData.name, opted_in: formData.opted_in }
        : formData;

      const res = await fetch('/api/contacts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save contact');
        return;
      }

      setShowAddModal(false);
      fetchContacts(search);
    } catch (err: any) {
      setFormError('Network error. Please try again.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleBulkImport = async () => {
    if (!parsedExcel || parsedExcel.validContacts.length === 0) return;

    setImporting(true);
    setImportError('');

    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: parsedExcel.validContacts.map(c => ({
            name: c.name,
            phone_number: c.normalizedPhone,
            opted_in: true
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || 'Failed to import contacts');
        return;
      }

      setShowImportModal(false);
      setParsedExcel(null);
      fetchContacts(search);
    } catch (err: any) {
      setImportError('Network error during bulk import.');
    } finally {
      setImporting(false);
    }
  };

  const toggleOptOut = async (contact: any) => {
    const res = await fetch('/api/contacts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: contact.id, opted_in: !contact.opted_in })
    });
    if (res.ok) fetchContacts(search);
  };

  const filteredContacts = contacts.filter(c => {
    if (statusFilter === 'opted_in') return c.opted_in;
    if (statusFilter === 'opted_out') return !c.opted_in;
    return true;
  });

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Audience & Contacts CRM"
          subtitle={`${total} WhatsApp customers in your database with E.164 normalization.`}
          badge={<Badge variant="primary">{total} Contacts</Badge>}
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => {
                  setImportError('');
                  setParsedExcel(null);
                  setShowImportModal(true);
                }}
                leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              >
                Import Excel / CSV
              </Button>
              <Button onClick={openAdd} leftIcon={<Plus className="w-4 h-4" />}>
                Add Contact
              </Button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-6">
          <Card className="overflow-hidden">
            {/* Toolbar */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or WhatsApp number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100/80 p-1 rounded-xl">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      statusFilter === 'all' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    All ({contacts.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('opted_in')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      statusFilter === 'opted_in' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Opted In
                  </button>
                  <button
                    onClick={() => setStatusFilter('opted_out')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      statusFilter === 'opted_out' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Opted Out
                  </button>
                </div>

                <Button variant="outline" size="sm" onClick={() => fetchContacts(search)} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>
                  Refresh
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">WhatsApp Number</th>
                    <th className="px-6 py-4">Marketing Status</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={contact.name} size="sm" />
                          <span className="font-bold text-slate-900 text-sm">{contact.name || 'Unknown Contact'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">
                        {contact.phone_number}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleOptOut(contact)}
                          className="cursor-pointer"
                          title="Click to toggle opt-in state"
                        >
                          {contact.opted_in ? (
                            <Badge variant="success" dot>Opted In</Badge>
                          ) : (
                            <Badge variant="danger" dot>Opted Out</Badge>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(contact.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(contact)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredContacts.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          icon={Users}
                          title="No contacts found"
                          description={
                            search 
                              ? `No contacts match "${search}". Try searching with another name or number.`
                              : "Build your WhatsApp audience by uploading an Excel spreadsheet or adding contacts."
                          }
                          actionLabel="Import Excel / CSV"
                          onAction={() => setShowImportModal(true)}
                          actionIcon={<FileSpreadsheet className="w-4 h-4" />}
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

      {/* Add / Edit Contact Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editContact ? 'Edit Contact' : 'Add WhatsApp Contact'}
        description="Contacts receive broadcasts and automated replies."
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="e.g. John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          {!editContact && (
            <Input
              label="WhatsApp Phone Number *"
              placeholder="+919876543210 (include country code)"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              helperText="Strict E.164 format with country code is automatically enforced."
              required
            />
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Marketing Broadcast Opt-In</p>
              <p className="text-[11px] text-slate-500 font-medium">Opted-out contacts will never receive campaign blasts.</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, opted_in: !formData.opted_in })}
              className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
                formData.opted_in ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={formSaving}>
              {editContact ? 'Update Contact' : 'Create Contact'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Excel / CSV Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        size="lg"
        title="Import Contacts from Excel or CSV"
        description="Upload your client spreadsheet with Names and WhatsApp Phone Numbers."
      >
        <div className="space-y-4">
          {importError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {importError}
            </div>
          )}

          <ExcelUploader
            parsedResult={parsedExcel}
            onParsed={(res) => setParsedExcel(res)}
            onClear={() => setParsedExcel(null)}
          />

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={importing}
              disabled={!parsedExcel || parsedExcel.validContacts.length === 0}
              onClick={handleBulkImport}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Import {parsedExcel?.validContacts.length || 0} Contacts
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
