import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { businessConfig } from '@/lib/config';
import { getWhatsAppConciergeUrl } from '@/lib/whatsapp';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Calendar,
  MessageSquare,
  Navigation,
  ExternalLink,
  Car,
  DoorOpen,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us & Location Directions | Classic Pearl Unisex Salon Arekere',
  description:
    'Visit Classic Pearl Unisex Salon at MNK Arcade, Arekere, Bengaluru. Call +91 74836 54138 or message on WhatsApp. Open 10:00 AM – 09:00 PM Everyday.',
};

export default function ContactPage() {
  const fullAddress = `${businessConfig.address.street}, ${businessConfig.address.city}, ${businessConfig.address.state} ${businessConfig.address.postalCode}`;

  return (
    <div className="bg-onyx text-pearl min-h-screen pt-32 pb-24">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 space-y-24">
        
        {/* ================= HERO HEADER ================= */}
        <section className="text-center max-w-3xl mx-auto space-y-8">
          <span className="text-[10px] tracking-[0.35em] text-gold uppercase font-bold block">
            Visit & Connect
          </span>
          <h1 className="font-serif text-5xl sm:text-7xl text-pearl leading-[1.1]">
            Contact <span className="italic text-gold-soft">Us</span>
          </h1>
          <p className="text-sm text-pearl/60 font-light leading-relaxed max-w-2xl mx-auto">
            Experience bespoke hair transformations, Korean skin rituals, and luxury grooming at{' '}
            <strong className="text-pearl font-normal">Classic Pearls Unisex Salon</strong> in Arekere, Bengaluru.
          </p>

          {/* Quick Highlights Bar */}
          <div className="flex flex-wrap justify-center items-center gap-6 pt-4 text-[10px] font-sans tracking-[0.2em] uppercase text-gold">
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3" />
              <span>Open 7 Days a Week</span>
            </div>
            <div className="flex items-center space-x-2">
              <DoorOpen className="w-3 h-3" />
              <span>Appointments & Walk-ins</span>
            </div>
          </div>
        </section>

        {/* ================= 2-COLUMN MAIN CONTACT & STOREFRONT SECTION ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-stretch">
          
          {/* LEFT COLUMN: CONTACT DETAILS & QUICK ACTIONS */}
          <div className="flex flex-col justify-center space-y-12">
            <div className="space-y-8">
              
              <div className="border-b border-pearl/10 pb-6">
                <span className="text-[9px] tracking-[0.2em] uppercase text-gold block mb-2">
                  Salon Directory
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-pearl">
                  Classic Pearls Salon
                </h2>
              </div>

              {/* Detail Items */}
              <div className="space-y-8 font-light">
                
                {/* Address Item */}
                <div className="flex items-start space-x-6">
                  <MapPin className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-pearl/50 block">
                      Physical Address
                    </span>
                    <p className="text-pearl text-sm leading-relaxed max-w-sm">
                      {fullAddress}
                    </p>
                    <p className="text-pearl/40 text-xs font-serif italic">
                      Landmark: Beside Camry Hospital, 80ft BDA Main Road
                    </p>
                  </div>
                </div>

                {/* Phone Item */}
                <div className="flex items-start space-x-6 border-t border-pearl/5 pt-8">
                  <Phone className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-pearl/50 block">
                      Direct Telephone
                    </span>
                    <div>
                      <a
                        href={`tel:${businessConfig.phoneRaw}`}
                        className="font-serif text-2xl text-pearl hover:text-gold transition-colors block"
                      >
                        {businessConfig.phone}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Email Item */}
                <div className="flex items-start space-x-6 border-t border-pearl/5 pt-8">
                  <Mail className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-pearl/50 block">
                      Official Email
                    </span>
                    <div>
                      <a
                        href={`mailto:${businessConfig.email}`}
                        className="font-sans text-sm text-pearl hover:text-gold transition-colors block"
                      >
                        {businessConfig.email}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Hours Item */}
                <div className="flex items-start space-x-6 border-t border-pearl/5 pt-8">
                  <Clock className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-pearl/50 block">
                      Operating Hours
                    </span>
                    <p className="text-pearl text-sm">
                      10:00 AM – 09:00 PM Everyday
                    </p>
                    <p className="text-pearl/40 text-xs font-sans tracking-wide uppercase">
                      Monday through Sunday
                    </p>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-8 border-t border-pearl/10 flex flex-col sm:flex-row gap-4">
                <a
                  href={businessConfig.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-pearl text-onyx hover:bg-gold px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get Directions</span>
                </a>

                <a
                  href={getWhatsAppConciergeUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-transparent hover:bg-charcoal border border-pearl/20 text-pearl px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-gold" />
                  <span>WhatsApp Chat</span>
                </a>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: PROMINENT REAL SALON STOREFRONT IMAGE */}
          <div className="flex flex-col">
            <div className="relative flex-1 bg-charcoal overflow-hidden aspect-[3/4] lg:aspect-auto">
              
              {/* Image Frame Container */}
              <div className="absolute inset-0 group">
                <Image
                  src="/salon-storefront.jpg"
                  alt="Classic Pearls Salon storefront in Arekere Bengaluru"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 ease-out group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-onyx/20 mix-blend-multiply"></div>

                {/* Minimalist Floating Badge */}
                <div className="absolute top-6 left-6 pointer-events-none">
                  <div className="bg-onyx/90 backdrop-blur-md px-4 py-2 border border-pearl/10 flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-gold animate-pulse"></span>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-pearl font-bold">Storefront</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </section>

        {/* ================= EMBEDDED GOOGLE MAPS SECTION ================= */}
        <section className="space-y-12 pt-12 border-t border-pearl/10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-4">
              <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-gold block">
                Navigation
              </span>
              <h2 className="font-serif text-4xl text-pearl">
                Our <span className="italic text-gold-soft">Location</span>
              </h2>
            </div>
            
            <div>
              <a
                href={businessConfig.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-3 bg-transparent border-b border-pearl/30 hover:border-gold text-pearl hover:text-gold px-0 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
              >
                <span>Open in Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Minimalist Map Container */}
          <div className="relative overflow-hidden border border-pearl/10 bg-charcoal h-[400px]">
            <iframe
              title="Classic Pearls Salon Location Map"
              src="https://maps.google.com/maps?q=MNK+Arcade,+80ft+BDA+Main+Rd,+Arekere,+Bengaluru,+Karnataka+560076&t=&z=16&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full filter grayscale-[30%] opacity-80 mix-blend-luminosity"
            />
          </div>
        </section>

        {/* ================= BOOK YOUR VISIT CTA SECTION ================= */}
        <section className="bg-charcoal border border-pearl/10 p-12 sm:p-24 text-center space-y-12">
          
          <div className="max-w-3xl mx-auto space-y-6">
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-gold block">
              Reservation
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl text-pearl leading-tight">
              Begin Your <span className="italic text-gold-soft">Experience</span>
            </h2>
            <p className="text-sm text-pearl/50 leading-relaxed font-light">
              Secure your appointment online or connect with our concierge for a personalized consultation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 max-w-xl mx-auto pt-4">
            <Link
              href="/book"
              className="w-full sm:w-auto flex-1 bg-pearl text-onyx hover:bg-gold px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Online</span>
            </Link>

            <a
              href={getWhatsAppConciergeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex-1 bg-transparent hover:bg-onyx border border-pearl/20 text-pearl px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-gold" />
              <span>WhatsApp Concierge</span>
            </a>
          </div>

        </section>

      </div>
    </div>
  );
}
