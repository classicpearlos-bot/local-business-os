'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Send,
  X,
  Bot,
  Calendar,
  MessageSquare,
  Minimize2,
  ChevronDown,
} from 'lucide-react';
import { getWhatsAppConciergeUrl } from '@/lib/whatsapp';
import { ServiceItem } from '@/lib/types';

// ========================
// TYPES
// ========================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  services?: ServiceItem[];
  quickReplies?: string[];
  timestamp: Date;
}

// ========================
// HELPER: TYPING INDICATOR
// ========================

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in-up">
      <div className="w-8 h-8 rounded-full bg-pearl flex items-center justify-center flex-shrink-0 border border-pearl/10">
        <Bot className="w-4 h-4 text-onyx" />
      </div>
      <div className="bg-charcoal border border-pearl/10 px-5 py-4 max-w-[85%] rounded-r-2xl rounded-bl-2xl">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  );
}

// ========================
// HELPER: SERVICE CARD
// ========================

function ServiceCard({ service }: { service: ServiceItem }) {
  return (
    <div className="bg-onyx border border-pearl/10 p-4 hover:border-gold transition-colors group rounded-none">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="text-xs font-serif text-pearl leading-tight flex-1">
          {service.name}
        </h4>
        <span className="text-[10px] font-sans tracking-widest text-gold whitespace-nowrap">
          ₹{service.memberPrice}
        </span>
      </div>
      <p className="text-[10px] text-pearl/50 mb-3 line-clamp-2 font-light">{service.tagline}</p>
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.2em] text-pearl/40">{service.duration}</span>
        <Link
          href="/book"
          className="text-[9px] uppercase tracking-[0.2em] font-bold text-gold hover:text-pearl flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}

// ========================
// HELPER: FORMAT MESSAGE TEXT
// ========================

function FormatText({ text }: { text: string }) {
  // Parse markdown-like formatting
  const lines = text.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Bold: **text**
        const formatted = line.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="text-pearl font-normal">$1</strong>'
        );
        // Strikethrough: ~~text~~
        const withStrike = formatted.replace(
          /~~(.*?)~~/g,
          '<del class="text-pearl/40">$1</del>'
        );
        // Emoji bullets
        const isListItem = /^[•✅🔹🏆💍🌸💃💡🧴📍⏰📞📱1️⃣2️⃣3️⃣4️⃣]/.test(line.trim());
        const isEmpty = line.trim() === '';

        if (isEmpty) return <div key={i} className="h-2" />;

        return (
          <p
            key={i}
            className={`text-xs text-pearl/80 font-light leading-[1.7] ${isListItem ? 'pl-1' : ''}`}
            dangerouslySetInnerHTML={{ __html: withStrike }}
          />
        );
      })}
    </div>
  );
}

// ========================
// MAIN COMPONENT
// ========================

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Detect scroll position for "scroll down" button
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollDown(!isNearBottom);
  }, []);

  // Send welcome message on first open
  const handleOpen = () => {
    setIsOpen(true);
    if (!hasSeenWelcome) {
      setHasSeenWelcome(true);
      const welcomeMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: "Hello! ✨ I'm Pearl, your personal AI beauty consultant at Classic Pearl Unisex Salon.\n\nI can help you choose the right treatments, check our transparent pricing, or book an appointment.\n\nWhat can I help you with today?",
        quickReplies: ['Hair treatments', 'Skin & facials', "Men's grooming", 'Bridal makeup', 'View pricing', 'Pearl Membership ₹199'],
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
    }
  };

  // Process and send a message
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages.map(msg => ({ role: msg.role, text: msg.text }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch AI response');
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: data.text,
        quickReplies: data.quickReplies,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: error.message || "I'm having a little trouble connecting right now. Please try again or WhatsApp our concierge for immediate assistance.",
        quickReplies: ['WhatsApp us'],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickReply = (reply: string) => {
    // Map quick reply labels to actionable routes or send as message
    if (reply === 'Book appointment' || reply === 'Book online now' || reply === 'Book a slot') {
      window.open('/book', '_blank');
      return;
    }
    if (reply === 'WhatsApp us' || reply === 'WhatsApp booking' || reply === 'WhatsApp salon' || reply === 'WhatsApp consultation' || reply === 'WhatsApp directions') {
      window.open(getWhatsAppConciergeUrl('Hi! I found you via the website.'), '_blank');
      return;
    }
    if (reply === 'Call salon') {
      window.open('tel:+917483654138', '_self');
      return;
    }
    if (reply === 'View refund policy') {
      window.open('/refund-policy', '_blank');
      return;
    }
    if (reply === 'View all services' || reply === 'All services' || reply === 'See all prices') {
      window.open('/services', '_blank');
      return;
    }
    if (reply === 'Get directions') {
      window.open('https://maps.google.com/?q=Classic+Pearl+Unisex+Salon+Arekere+Bengaluru', '_blank');
      return;
    }
    sendMessage(reply);
  };

  return (
    <>
      {/* ======= FLOATING ACTION BUTTON ======= */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-pearl text-onyx flex items-center justify-center hover:scale-105 transition-transform duration-300 group rounded-none shadow-2xl shadow-pearl/10"
          aria-label="Open AI Beauty Consultant"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* ======= CHAT PANEL ======= */}
      {isOpen && (
        <div
          className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[440px] h-[100dvh] sm:h-[650px] bg-onyx sm:border border-pearl/10 flex flex-col overflow-hidden shadow-2xl shadow-onyx/50"
          style={{
            animation: 'fadeInUp 0.3s ease-out',
          }}
        >
          {/* ---- HEADER ---- */}
          <div className="bg-charcoal border-b border-pearl/10 px-5 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-pearl/20 bg-onyx flex items-center justify-center">
                <Bot className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h3 className="text-xs font-serif text-pearl tracking-widest uppercase">Pearl AI</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1.5 h-1.5 bg-green-500 animate-pulse"></span>
                  <span className="text-[9px] text-pearl/50 uppercase tracking-[0.2em]">Always Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-pearl/5 transition-colors"
                aria-label="Minimize chat"
              >
                <Minimize2 className="w-4 h-4 text-pearl/60" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-pearl/5 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4 text-pearl/60" />
              </button>
            </div>
          </div>

          {/* ---- MESSAGES ---- */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-none"
          >
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  /* User Message */
                  <div className="flex justify-end animate-fade-in-up">
                    <div className="bg-pearl text-onyx px-5 py-3.5 max-w-[80%] rounded-l-2xl rounded-tr-2xl">
                      <p className="text-xs font-sans leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  /* Assistant Message */
                  <div className="animate-fade-in-up space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-pearl flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-onyx" />
                      </div>
                      <div className="bg-charcoal border border-pearl/10 px-5 py-4 max-w-[85%] rounded-r-2xl rounded-bl-2xl">
                        <FormatText text={msg.text} />
                      </div>
                    </div>

                    {/* Service Cards (Legacy support if the API returned structured data, but currently the new API only returns text and quickReplies) */}
                    {msg.services && msg.services.length > 0 && (
                      <div className="ml-[44px] grid grid-cols-1 gap-3">
                        {msg.services.slice(0, 3).map((service) => (
                          <ServiceCard key={service.id} service={service} />
                        ))}
                      </div>
                    )}

                    {/* Quick Replies */}
                    {msg.quickReplies && msg.quickReplies.length > 0 && (
                      <div className="ml-[44px] flex flex-wrap gap-2">
                        {msg.quickReplies.map((reply, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickReply(reply)}
                            className="text-[9px] font-bold uppercase tracking-[0.1em] text-onyx bg-gold hover:bg-pearl px-4 py-2 transition-colors"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll Down Button */}
          {showScrollDown && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-[90px] left-1/2 -translate-x-1/2 bg-charcoal border border-pearl/10 text-pearl p-2 rounded-full shadow-2xl hover:bg-onyx transition-all z-10"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}

          {/* ---- INPUT BAR ---- */}
          <div className="border-t border-pearl/10 bg-charcoal px-4 py-4 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about treatments, pricing, or booking..."
                className="flex-1 bg-onyx border border-pearl/10 focus:border-gold text-pearl text-xs px-4 py-3 outline-none transition-colors placeholder:text-pearl/30"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="w-11 h-11 bg-pearl text-onyx flex items-center justify-center disabled:opacity-30 transition-all hover:bg-gold"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Action Bar */}
            <div className="flex items-center justify-between mt-4 px-1">
              <div className="flex gap-4">
                <Link
                  href="/book"
                  className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-gold hover:text-pearl transition-colors"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Book</span>
                </Link>
                <a
                  href={getWhatsAppConciergeUrl('Hi, I was chatting with the AI consultant on your website.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-pearl/50 hover:text-pearl transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>
              </div>
              <span className="text-[8px] uppercase tracking-widest text-pearl/20">
                Powered by Gemini
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
