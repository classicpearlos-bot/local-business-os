'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  MessageCircle,
  Calendar,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
  ShieldCheck,
  Crown,
  Heart
} from 'lucide-react';

interface ServiceItem {
  id: string | number;
  name: string;
  category: string;
  regular_price: number;
  member_price: number;
  description?: string;
  whatsapp_number?: string;
}

export default function CustomerServicesMenu() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Default WhatsApp Booking Phone
  const defaultWhatsApp = '918310730322';

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        if (data.services) {
          setServices(data.services);
          setCategories(['All', ...(data.categories || [])]);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesCategory =
        activeCategory === 'All' ||
        service.category.toLowerCase().includes(activeCategory.toLowerCase());
      const matchesSearch =
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [services, activeCategory, searchQuery]);

  // Generate WhatsApp Link
  const getWhatsAppLink = (serviceName: string, actionType: 'inquire' | 'book', customPhone?: string) => {
    const rawNumber = (customPhone || defaultWhatsApp).replace(/\D/g, '');
    const cleanNumber = rawNumber.startsWith('91') ? rawNumber : `91${rawNumber}`;

    const text =
      actionType === 'inquire'
        ? `Hello, hi, I want to inquire about this service: ${serviceName}`
        : `Hello, hi, I want to book this service: ${serviceName}`;

    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-[#292722] font-sans antialiased selection:bg-[#B08D57] selection:text-white">
      {/* ─── Top Luxury Header ─── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E5DED2]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#292722] flex items-center justify-center text-[#D6B878] font-serif font-black text-sm shadow-md border border-[#B08D57]/40">
              CP
            </div>
            <div>
              <h1 className="font-serif font-black text-sm md:text-base text-[#292722] tracking-tight flex items-center gap-1.5">
                Classic Pearl Unisex Salon
                <ShieldCheck className="w-3.5 h-3.5 text-[#B08D57]" />
              </h1>
              <p className="text-[10px] text-[#706B61] flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-[#B08D57]" /> Premium Hair, Skin & Grooming
              </p>
            </div>
          </div>

          <a
            href={`https://wa.me/${defaultWhatsApp}?text=${encodeURIComponent('Hi, I want to book an appointment at Classic Pearl Salon.')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white text-[11px] font-black shadow-md transition-all active:scale-95"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chat with Us</span>
          </a>
        </div>
      </header>

      {/* ─── Hero Banner ─── */}
      <section className="bg-gradient-to-b from-[#292722] via-[#38352F] to-[#292722] text-white px-4 py-8 md:py-12 border-b border-[#B08D57]/20">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B08D57]/25 border border-[#B08D57]/40 text-[#D6B878] text-[10px] font-black tracking-widest uppercase">
            <Crown className="w-3 h-3 text-[#D6B878]" />
            Member Privileges & Pricing Available
          </div>
          <h2 className="font-serif text-2xl md:text-4xl font-black tracking-tight">
            Our Services & Price List
          </h2>
          <p className="text-xs md:text-sm text-[#D8D2C5] max-w-lg mx-auto leading-relaxed">
            Select any service below to inquire details or book directly with our salon team on WhatsApp.
          </p>

          {/* Search Bar inside Hero */}
          <div className="pt-3 max-w-md mx-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#9E968D]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search haircuts, facials, beard, spa…"
                className="w-full pl-10 pr-4 py-3 bg-white text-[#292722] placeholder-[#9E968D] rounded-2xl text-xs font-medium outline-none shadow-lg focus:ring-2 focus:ring-[#B08D57]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Category Filter Chips ─── */}
      <section className="sticky top-[57px] z-30 bg-[#F8F5EF]/95 backdrop-blur-sm border-b border-[#E5DED2] py-3 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-[#292722] text-white shadow-md'
                  : 'bg-white text-[#706B61] border border-[#E5DED2] hover:bg-[#EFE3CF]/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Services List ─── */}
      <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {loading ? (
          <div className="py-20 text-center text-xs text-[#9E968D] space-y-2">
            <Sparkles className="w-6 h-6 text-[#B08D57] animate-spin mx-auto" />
            <p>Loading salon service menu…</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="py-20 text-center text-xs text-[#9E968D]">
            No services found matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredServices.map(service => {
              const savings = service.regular_price - service.member_price;
              const inquireUrl = getWhatsAppLink(service.name, 'inquire', service.whatsapp_number);
              const bookUrl = getWhatsAppLink(service.name, 'book', service.whatsapp_number);

              return (
                <div
                  key={service.id}
                  className="bg-white rounded-2xl border border-[#E5DED2] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E5DED2] text-[9px] font-bold uppercase tracking-wider text-[#706B61]">
                        {service.category}
                      </span>
                      {savings > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFF9E6] border border-[#F0D58C] text-[#B08D57] text-[10px] font-black">
                          <Crown className="w-2.5 h-2.5" /> Save ₹{savings}
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif font-black text-sm text-[#292722] leading-snug">
                      {service.name}
                    </h3>

                    {service.description && (
                      <p className="text-[11px] text-[#706B61] leading-relaxed">
                        {service.description}
                      </p>
                    )}
                  </div>

                  {/* Pricing Breakdown & WhatsApp CTA Buttons */}
                  <div className="pt-3 border-t border-[#F0EBE3] space-y-3">
                    {/* Price Comparison */}
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#9E968D] block uppercase tracking-wider">
                          Non-Member
                        </span>
                        <span className="text-xs font-semibold text-[#706B61] line-through">
                          ₹{service.regular_price}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-black text-[#B08D57] block uppercase tracking-wider flex items-center justify-end gap-1">
                          <Crown className="w-2.5 h-2.5" /> Member Price
                        </span>
                        <span className="text-base font-serif font-black text-[#292722]">
                          ₹{service.member_price}
                        </span>
                      </div>
                    </div>

                    {/* The 2 Direct WhatsApp Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={inquireUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#B08D57]/40 bg-[#FAF7F2] hover:bg-[#F0EBE3] text-[#292722] text-[11px] font-bold transition-all active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#B08D57]" />
                        Inquire
                      </a>

                      <a
                        href={bookUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-[11px] font-black shadow-sm transition-all active:scale-95"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Book Service
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-white border-t border-[#E5DED2] py-6 px-4 text-center space-y-2 mt-12">
        <p className="font-serif font-black text-xs text-[#292722]">
          Classic Pearl Unisex Salon
        </p>
        <p className="text-[10px] text-[#9E968D]">
          Appointments & Customer Inquiries: +91 83107 30322 / +91 74836 54138
        </p>
      </footer>
    </div>
  );
}
