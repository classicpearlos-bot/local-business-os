'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import {
  Sparkles,
  Search,
  Plus,
  Edit2,
  Trash2,
  Share2,
  ExternalLink,
  Check,
  Copy,
  MessageCircle,
  Calendar,
  Tag,
  Filter,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ServiceItem {
  id: string | number;
  name: string;
  tier?: string;
  category: string;
  regular_price: number;
  member_price: number;
  image_url?: string;
  description?: string;
  whatsapp_number?: string;
}

export default function ServicesAdminPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    regular_price: '',
    member_price: '',
    description: '',
    whatsapp_number: '+91 83107 30322'
  });
  const [saving, setSaving] = useState<boolean>(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/services');
      const data = await res.json();
      if (data.services) {
        setServices(data.services);
        setCategories(['All', ...(data.categories || [])]);
      }
    } catch (err) {
      console.error('Failed to load services', err);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesCategory =
        selectedCategory === 'All' ||
        service.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchesSearch =
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  const handleCopyMenuLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const menuUrl = `${origin}/menu`;
    navigator.clipboard.writeText(menuUrl);
    setCopiedLink(true);
    toast.success('Public Services Menu link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      category: categories.find(c => c !== 'All') || 'General',
      regular_price: '',
      member_price: '',
      description: '',
      whatsapp_number: '+91 83107 30322'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category: service.category,
      regular_price: String(service.regular_price),
      member_price: String(service.member_price),
      description: service.description || '',
      whatsapp_number: service.whatsapp_number || '+91 83107 30322'
    });
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.regular_price || !formData.member_price) {
      toast.error('Please fill in Name, Regular Price, and Member Price');
      return;
    }

    setSaving(true);
    try {
      if (editingService) {
        // Update
        const res = await fetch(`/api/services/${editingService.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            category: formData.category,
            regular_price: Number(formData.regular_price),
            member_price: Number(formData.member_price),
            description: formData.description,
            whatsapp_number: formData.whatsapp_number
          })
        });
        if (res.ok) {
          toast.success('Service updated successfully!');
          fetchServices();
          setIsModalOpen(false);
        } else {
          toast.error('Failed to update service');
        }
      } else {
        // Create
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          toast.success('Service created successfully!');
          fetchServices();
          setIsModalOpen(false);
        } else {
          toast.error('Failed to create service');
        }
      }
    } catch {
      toast.error('Error saving service');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id: string | number) => {
    if (!confirm('Are you sure you want to remove this service?')) return;
    try {
      await fetch(`/api/services/${id}`, { method: 'DELETE' });
      setServices(prev => prev.filter(s => s.id !== id));
      toast.success('Service removed.');
    } catch {
      toast.error('Failed to delete service.');
    }
  };

  return (
    <div className="flex h-screen bg-[#F8F5EF] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title="Salon Services Menu" />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Header Banner & Public Share Link */}
          <div className="bg-gradient-to-r from-[#292722] to-[#3D3A33] rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B08D57]/20 border border-[#B08D57]/40 text-[#D6B878] text-xs font-bold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[#D6B878]" />
                Classic Pearl Salon Menu
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight">
                Manage Services & Pricing
              </h1>
              <p className="text-xs md:text-sm text-[#D8D2C5] leading-relaxed">
                Configure your service offerings with Regular and Member discounts. Customers can view your live menu, inquire, or book directly via WhatsApp.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCopyMenuLink}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all shadow-sm"
              >
                {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-[#D6B878]" />}
                {copiedLink ? 'Link Copied!' : 'Copy Public Menu Link'}
              </button>

              <a
                href="/menu"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B08D57] hover:bg-[#967443] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg"
              >
                <ExternalLink className="w-4 h-4" />
                Preview Customer Menu
              </a>

              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#292722] hover:bg-[#F8F5EF] text-xs font-black transition-all shadow-md"
              >
                <Plus className="w-4 h-4 text-[#B08D57]" />
                Add New Service
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E5DED2] shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#9E968D]">Total Services</span>
              <p className="text-2xl font-serif font-black text-[#292722] mt-1">{services.length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E5DED2] shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#9E968D]">Categories</span>
              <p className="text-2xl font-serif font-black text-[#292722] mt-1">{categories.filter(c => c !== 'All').length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E5DED2] shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#9E968D]">Avg Member Savings</span>
              <p className="text-2xl font-serif font-black text-[#B08D57] mt-1">&#8377;30 – &#8377;100</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E5DED2] shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#9E968D]">Booking WhatsApp</span>
              <p className="text-xs font-bold text-[#292722] mt-2 truncate">+91 83107 30322</p>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5DED2] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#9E968D]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search services or categories…"
                className="w-full pl-9 pr-4 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 w-full md:w-auto">
              {categories.slice(0, 8).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#292722] text-white shadow-xs'
                      : 'bg-[#F8F5EF] text-[#706B61] hover:bg-[#EFE3CF]/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Services Table */}
          <div className="bg-white rounded-2xl border border-[#E5DED2] shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-xs text-[#9E968D]">Loading salon services catalog…</div>
            ) : filteredServices.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#9E968D]">
                No services found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#292722]">
                  <thead className="bg-[#FAF7F2] border-b border-[#E5DED2] text-[10px] font-black uppercase tracking-wider text-[#706B61]">
                    <tr>
                      <th className="px-6 py-3.5">Service Name</th>
                      <th className="px-6 py-3.5">Category</th>
                      <th className="px-6 py-3.5">Regular Price</th>
                      <th className="px-6 py-3.5">Member Price</th>
                      <th className="px-6 py-3.5">Customer Savings</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DED2]">
                    {filteredServices.map(service => {
                      const savings = service.regular_price - service.member_price;
                      return (
                        <tr key={service.id} className="hover:bg-[#F8F5EF]/60 transition-colors">
                          <td className="px-6 py-4 font-bold text-[#292722]">
                            <div className="flex items-center gap-3">
                              {service.image_url ? (
                                <img
                                  src={service.image_url}
                                  alt=""
                                  onError={(e: any) => { e.target.style.display = 'none'; }}
                                  className="w-10 h-10 rounded-lg object-cover border border-[#E5DED2] shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-[#FAF7F2] border border-[#E5DED2] flex items-center justify-center text-[#B08D57] shrink-0 font-serif font-black text-xs">
                                  CP
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span>{service.name}</span>
                                  {service.tier && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#292722] text-[#D6B878] text-[9px] font-black uppercase">
                                      {service.tier}
                                    </span>
                                  )}
                                </div>
                                {service.description && (
                                  <p className="text-[10px] font-normal text-[#9E968D] line-clamp-1 mt-0.5">
                                    {service.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E5DED2] text-[10px] font-semibold text-[#706B61]">
                              {service.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[#706B61] font-semibold">
                            &#8377;{service.regular_price}
                          </td>
                          <td className="px-6 py-4 font-black text-[#B08D57]">
                            &#8377;{service.member_price}
                          </td>
                          <td className="px-6 py-4">
                            {savings > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 font-black text-[10px] border border-green-200">
                                Save &#8377;{savings}
                              </span>
                            ) : (
                              <span className="text-[#9E968D] text-[10px]">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditModal(service)}
                                className="p-1.5 rounded-lg border border-[#E5DED2] hover:bg-white text-[#706B61] hover:text-[#292722] transition-colors"
                                title="Edit Service"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteService(service.id)}
                                className="p-1.5 rounded-lg border border-[#E5DED2] hover:bg-red-50 text-[#9E968D] hover:text-red-500 transition-colors"
                                title="Delete Service"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#E5DED2] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-[#E5DED2] bg-[#FAF7F2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#B08D57]/20 border border-[#B08D57]/40 flex items-center justify-center text-[#B08D57]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-black text-[#292722] text-base">
                  {editingService ? 'Edit Service' : 'Add New Service'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#9E968D] hover:text-[#292722] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#706B61] mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Keratin Hair Spa"
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#706B61] mb-1">Category *</label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Haircut, Beard, Facial, Spa"
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#706B61] mb-1">Regular Price (&#8377;) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.regular_price}
                    onChange={e => setFormData({ ...formData, regular_price: e.target.value })}
                    placeholder="349"
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#706B61] mb-1">Member Price (&#8377;) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.member_price}
                    onChange={e => setFormData({ ...formData, member_price: e.target.value })}
                    placeholder="299"
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#706B61] mb-1">WhatsApp Booking Number</label>
                <input
                  type="text"
                  value={formData.whatsapp_number}
                  onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  placeholder="+91 83107 30322"
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#706B61] mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Includes wash, blast dry, and styling."
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#E5DED2] rounded-xl text-xs text-[#292722] outline-none focus:border-[#B08D57] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5DED2]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5DED2] text-[#706B61] hover:bg-[#F8F5EF] text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#B08D57] hover:bg-[#967443] text-white text-xs font-black transition-all shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingService ? 'Update Service' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
