'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  MessageCircle,
  Calendar,
  MapPin,
  ShieldCheck,
  Crown,
  ArrowLeft,
  X
} from 'lucide-react';

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

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80';

export default function CustomerServicesMenu() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [activeTier, setActiveTier] = useState<string>('All');
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
        }
      })
      .catch(err => console.error('Failed to load services:', err))
      .finally(() => setLoading(false));
  }, []);

  // Counts for each tier
  const tierCounts = useMemo(() => {
    const counts = { All: services.length, Men: 0, Women: 0, Both: 0 };
    for (const s of services) {
      if (s.tier === 'Men') counts.Men++;
      else if (s.tier === 'Women') counts.Women++;
      else if (s.tier === 'Both') counts.Both++;
    }
    return counts;
  }, [services]);

  // Categories available under the current active tier
  const tierCategories = useMemo(() => {
    const relevant = activeTier === 'All' 
      ? services 
      : services.filter(s => (s.tier || '').toLowerCase() === activeTier.toLowerCase());
    const cats = Array.from(new Set(relevant.map(s => s.category))).sort();
    return ['All', ...cats];
  }, [services, activeTier]);

  // Reset category if not in current tier categories
  useEffect(() => {
    if (!tierCategories.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [activeTier, tierCategories, activeCategory]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      // Tier filter
      const matchesTier =
        activeTier === 'All' ||
        (service.tier || '').toLowerCase() === activeTier.toLowerCase();

      // Category filter
      const matchesCategory =
        activeCategory === 'All' ||
        service.category.toLowerCase().includes(activeCategory.toLowerCase());

      // Search filter
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        service.name.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query) ||
        (service.tier || '').toLowerCase().includes(query);

      return matchesTier && matchesCategory && matchesSearch;
    });
  }, [services, activeTier, activeCategory, searchQuery]);

  // WhatsApp Link Generator
  const getWhatsAppLink = (serviceName: string, actionType: 'inquire' | 'book', customPhone?: string) => {
    const rawNumber = (customPhone || defaultWhatsApp).replace(/\D/g, '');
    const cleanNumber = rawNumber.startsWith('91') ? rawNumber : `91${rawNumber}`;

    const text =
      actionType === 'inquire'
        ? `Hello, hi, I want to inquire about this service: ${serviceName}`
        : `Hello, hi, I want to book this service: ${serviceName}`;

    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
  };

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = `https://wa.me/${defaultWhatsApp}`;
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-[#292722] font-sans antialiased selection:bg-[#B08D57] selection:text-white">
      {/* ??? Top Luxury Header (100% Isolated: Zero Admin Links) ??? */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5DED2] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              title="Return to WhatsApp"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F4EFE6] hover:bg-[#EAE2D5] text-[#706B61] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-[#292722] flex items-center justify-center text-[#D6B878] font-serif font-black text-sm shadow-md border border-[#B08D57]/40">
              CP
            </div>
            <div>
              <h1 className="font-serif font-black text-sm sm:text-base text-[#292722] tracking-tight flex items-center gap-1.5">
                Classic Pearl Unisex Salon
                <ShieldCheck className="w-3.5 h-3.5 text-[#B08D57]" />
              </h1>
              <p className="text-[10px] text-[#706B61] flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-[#B08D57]" /> Premium Hair, Beauty & Grooming
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${defaultWhatsApp}?text=${encodeURIComponent('Hi, I want to book an appointment at Classic Pearl Salon.')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-black shadow-sm transition-all active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp Us</span>
            </a>
          </div>
        </div>
      </header>

      {/* ??? Hero Banner ??? */}
      <section className="bg-gradient-to-b from-[#292722] via-[#35322B] to-[#292722] text-white px-4 sm:px-6 lg:px-8 py-8 md:py-10 border-b border-[#B08D57]/30">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B08D57]/20 border border-[#B08D57]/40 text-[#D6B878] text-[10px] font-black tracking-widest uppercase">
            <Crown className="w-3 h-3 text-[#D6B878]" />
            Member Privileges & Special Pricing
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
            Salon Services & Official Rate Card
          </h2>
          <p className="text-xs sm:text-sm text-[#D8D2C5] max-w-xl mx-auto leading-relaxed">
            Browse our full catalog below. Tap <strong className="text-white">Inquire</strong> to ask questions or <strong className="text-white">Book</strong> to confirm directly via WhatsApp.
          </p>

          {/* Search Bar */}
          <div className="pt-2 max-w-lg mx-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-[#9E968D]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search haircuts, beard, facial, keratin, hair spa, waxing?"
                className="w-full pl-11 pr-10 py-3 bg-white text-[#292722] placeholder-[#9E968D] rounded-2xl text-xs sm:text-sm font-medium outline-none shadow-lg focus:ring-2 focus:ring-[#B08D57]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 text-[#9E968D] hover:text-[#292722]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ??? 3 Tiers Selector: All, Men, Women, Unisex/Both ??? */}
      <section className="bg-white border-b border-[#E5DED2] sticky top-[57px] z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Tier Tabs */}
          <div className="flex items-center gap-2 py-2.5 overflow-x-auto no-scrollbar border-b border-[#F0EBE3]">
            {[
              { id: 'All', label: 'All Services', count: tierCounts.All },
              { id: 'Men', label: "Men's Grooming", count: tierCounts.Men },
              { id: 'Women', label: "Women's Beauty", count: tierCounts.Women },
              { id: 'Both', label: 'Facial & Spa (Unisex)', count: tierCounts.Both }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTier(tab.id);
                  setActiveCategory('All');
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeTier === tab.id
                    ? 'bg-[#292722] text-white shadow-sm'
                    : 'bg-[#FAF7F2] text-[#706B61] hover:bg-[#EFE9DF] hover:text-[#292722]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    activeTier === tab.id
                      ? 'bg-[#D6B878] text-[#292722]'
                      : 'bg-[#E5DED2] text-[#706B61]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Sub-Category Filter Pills */}
          <div className="flex items-center gap-1.5 py-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] uppercase font-black tracking-wider text-[#9E968D] mr-1 hidden sm:inline">
              Category:
            </span>
            {tierCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-[#B08D57] text-white shadow-xs'
                    : 'bg-white text-[#706B61] border border-[#E5DED2] hover:bg-[#FAF7F2] hover:text-[#292722]'
                }`}
              >
                {cat.replace(/^(Men - |Women - |Both - )/, '')}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ??? Main Grid: EXACTLY 4 Cards Per Row (1, 2, 3, 4) ??? */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-bold text-[#706B61]">
            Showing <span className="text-[#292722] font-black">{filteredServices.length}</span> services
            {activeTier !== 'All' && <span> in <span className="text-[#B08D57]">{activeTier}</span></span>}
            {activeCategory !== 'All' && <span> ? {activeCategory}</span>}
          </p>

          <span className="text-[11px] text-[#9E968D] font-medium hidden sm:inline">
            ? Gold Member rates applied automatically
          </span>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-[#B08D57] animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#706B61]">Loading Classic Pearl Services Menu?</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-3xl border border-[#E5DED2] p-8 space-y-3">
            <Search className="w-10 h-10 text-[#B08D57] mx-auto opacity-50" />
            <h3 className="font-serif font-black text-base text-[#292722]">No services found</h3>
            <p className="text-xs text-[#706B61]">
              Try searching with another keyword or switch category filters.
            </p>
            <button
              onClick={() => {
                setActiveTier('All');
                setActiveCategory('All');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-[#292722] text-white text-xs font-bold hover:bg-black transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* ??? 4 CARDS PER ROW GRID (grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4) ??? */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredServices.map(service => {
              const savings = service.regular_price - service.member_price;
              const inquireUrl = getWhatsAppLink(service.name, 'inquire', service.whatsapp_number);
              const bookUrl = getWhatsAppLink(service.name, 'book', service.whatsapp_number);
              const categoryClean = service.category.replace(/^(Men - |Women - |Both - )/, '');

              return (
                <div
                  key={service.id}
                  className="group bg-white rounded-2xl border border-[#E5DED2] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Service Stock Image & Badge */}
                  <div>
                    <div className="relative h-44 w-full bg-[#292722] overflow-hidden">
                      <img
                        src={service.image_url || FALLBACK_IMAGE}
                        alt={service.name}
                        loading="lazy"
                        onError={(e: any) => {
                          e.target.src = FALLBACK_IMAGE;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      />

                      {/* Top Overlay Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-md bg-[#292722]/80 backdrop-blur-md text-[#D6B878] text-[9px] font-black uppercase tracking-wider border border-[#D6B878]/30">
                          {service.tier || 'Salon'}
                        </span>

                        {savings > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-[#D6B878] text-[#292722] text-[9px] font-black shadow-xs">
                            <Crown className="w-2.5 h-2.5" /> Save ?{savings}
                          </span>
                        )}
                      </div>

                      {/* Category Pill Tag Bottom Right */}
                      <div className="absolute bottom-2 left-2.5">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold tracking-tight">
                          {categoryClean}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <h3 className="font-serif font-black text-sm text-[#292722] leading-snug line-clamp-2 min-h-[2.5rem]">
                        {service.name}
                      </h3>

                      {service.description && (
                        <p className="text-[11px] text-[#706B61] line-clamp-2 leading-relaxed">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pricing Breakdown & WhatsApp Action Buttons */}
                  <div className="p-4 pt-2 border-t border-[#F0EBE3] space-y-3 bg-[#FAF8F5]/50">
                    {/* Price Comparison */}
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-[#9E968D] block uppercase tracking-wider">
                          Non-Member
                        </span>
                        <span className="text-xs font-semibold text-[#706B61] line-through">
                          ?{service.regular_price}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] font-black text-[#B08D57] block uppercase tracking-wider flex items-center justify-end gap-1">
                          <Crown className="w-2.5 h-2.5" /> Member Price
                        </span>
                        <span className="text-lg font-serif font-black text-[#292722]">
                          ?{service.member_price}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Inquire & Book */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={inquireUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl border border-[#B08D57]/50 bg-white hover:bg-[#FAF7F2] text-[#292722] text-[11px] font-bold transition-all active:scale-95 text-center"
                      >
                        <MessageCircle className="w-3 h-3 text-[#B08D57]" />
                        <span>Inquire</span>
                      </a>

                      <a
                        href={bookUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-[11px] font-black shadow-xs transition-all active:scale-95 text-center"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>Book</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ??? Footer (Isolated) ??? */}
      <footer className="bg-white border-t border-[#E5DED2] py-8 px-4 sm:px-6 lg:px-8 text-center space-y-3 mt-12">
        <div className="w-8 h-8 rounded-xl bg-[#292722] text-[#D6B878] font-serif font-black text-xs flex items-center justify-center mx-auto">
          CP
        </div>
        <p className="font-serif font-black text-sm text-[#292722]">
          Classic Pearl Unisex Salon
        </p>
        <p className="text-xs text-[#706B61] max-w-md mx-auto">
          Customer Support & Appointments: +91 83107 30322 ? Bangalore
        </p>
        <p className="text-[10px] text-[#9E968D]">
          Prices and services are subject to change. Terms apply for member pricing.
        </p>
      </footer>
    </div>
  );
}
