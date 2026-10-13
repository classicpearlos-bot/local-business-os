'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { FlowCanvas } from '@/components/flows/FlowCanvas';
import { FlowRecord, FlowDefinition } from '@/lib/flows/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'react-hot-toast';
import {
  Zap,
  Plus,
  Sparkles,
  Clock,
  Split,
  Layers,
  ArrowRight,
  Trash2,
  Edit3,
  PlayCircle,
  PauseCircle,
  MoreVertical,
  MessageSquare,
  Users,
  Calendar,
  GitBranch,
  AlertCircle,
  Bot,
  ShieldCheck,
  Send,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Flame,
  Star,
  Scissors,
  Gift,
  ExternalLink,
  ChevronRight,
  PhoneCall,
  MapPin,
  Search,
  Check
} from 'lucide-react';

const TRIGGER_LABELS: Record<string, string> = {
  KEYWORD: '💬 Keyword',
  BUTTON_CLICK: '🔘 Button Click',
  NEW_CONTACT: '👤 New Contact',
  APPOINTMENT_COMPLETED: '📅 Appointment Done',
  BIRTHDAY: '🎂 Birthday',
  '45_DAY_INACTIVE': '⏰ 45-Day Inactive',
  '90_DAY_INACTIVE': '⏰ 90-Day Inactive',
  MANUAL_LAUNCH: '▶️ Manual Launch'
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  DRAFT: 'bg-amber-100 text-amber-800 border-amber-200',
  PAUSED: 'bg-slate-100 text-slate-600 border-slate-200',
  ARCHIVED: 'bg-red-100 text-red-700 border-red-200'
};

// Preset Quick Stress Tests for Simulator
const QUICK_TESTS = [
  { label: '💇 Hair Spa Options', prompt: 'how much for hair spa?' },
  { label: '🧔 Beard Trim (Men)', prompt: 'how much for beard trim?' },
  { label: '🪒 Head Shave (Men)', prompt: 'how much for head shave?' },
  { label: '💆 Body Massage (Boundary Test)', prompt: 'do you have body massage?' },
  { label: '🧖 Korean Glass Facial', prompt: 'how much for facial?' },
  { label: '🦶 Pedicure / Manicure', prompt: 'how much for pedicure?' },
  { label: '⏰ "Is It Free Now?"', prompt: 'is it free right now? can i come?' },
  { label: '📍 Salon Location', prompt: 'where is your salon located?' },
  { label: '🎁 Today\'s Offers', prompt: 'is there any offer going on?' }
];

export default function FlowsPage() {
  // Main Navigation Tabs
  const [activeTab, setActiveTab] = useState<'simulator' | 'guardrails' | 'journeys' | 'canvas'>('simulator');

  // Flows State
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEditingFlow, setActiveEditingFlow] = useState<FlowRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDesc, setNewFlowDesc] = useState('');
  const [newFlowTrigger, setNewFlowTrigger] = useState<string>('KEYWORD');
  const [creating, setCreating] = useState(false);

  // Simulator State
  const [simMessages, setSimMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: '✨ *Welcome to Classic Pearl Unisex Salon!* ✨\n\nI am Pearl Assistant, your 24/7 AI concierge. You can test any question with me here in real time—ask about our Hair Spa, Haircuts, Facials, Beard Grooming, Location, or Offers! 💛',
      time: '13:00'
    }
  ]);
  const [simInput, setSimInput] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simDiagnostic, setSimDiagnostic] = useState<{
    detectedIntent: string;
    engineUsed: string;
    latencyMs: number;
    guardrailsTriggered: string[];
  } | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Knowledge Base State
  const [faqs, setFaqs] = useState<any[]>([]);
  const [guardrails, setGuardrails] = useState<any[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [showAddFaqModal, setShowAddFaqModal] = useState(false);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [newFaqCategory, setNewFaqCategory] = useState('Logistics');
  const [savingFaq, setSavingFaq] = useState(false);

  // Smart Journeys State
  const [journeys, setJourneys] = useState([
    {
      id: 'j_review_booster',
      title: '🌟 Post-Visit Google Review Booster',
      trigger: '2 Hours after Appointment Completion',
      desc: 'Automatically checks in on customer satisfaction and shares the direct Google Maps 5-star review link.',
      active: true,
      stats: '4.9★ Average | 142 Reviews Collected'
    },
    {
      id: 'j_haircut_cycle',
      title: '✂️ Men\'s 21-Day Grooming Cycle Reminder',
      trigger: '21 Days since Last Men\'s Haircut / Beard',
      desc: 'Invites male clients back to refresh their fade and beard styling before it overgrows.',
      active: true,
      stats: '34% Rebooking Rate'
    },
    {
      id: 'j_spa_reengage',
      title: '💆 Women\'s 30-Day Hair Spa & Color Re-engagement',
      trigger: '30 Days since Last Hair Treatment',
      desc: 'Suggests a restorative deep-nourishing hair spa or root touch-up to keep hair glossy and healthy.',
      active: true,
      stats: '28% Rebooking Rate'
    },
    {
      id: 'j_birthday_club',
      title: '🎂 VIP Birthday Club Celebration',
      trigger: 'On Contact\'s Birthday at 9:00 AM',
      desc: 'Sends a warm birthday wish along with an exclusive ₹300 pampering gift voucher valid for 7 days.',
      active: true,
      stats: '46% Voucher Redemption'
    },
    {
      id: 'j_winback_45d',
      title: '💔 45-Day Inactive Client Win-Back',
      trigger: '45 Days of Inactivity',
      desc: 'Offers a personalized ₹200 salon invitation to revive inactive clients before they drift away.',
      active: true,
      stats: '19% Client Recovery'
    }
  ]);

  useEffect(() => {
    fetchFlows();
    fetchKnowledge();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simMessages]);

  const fetchFlows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/flows');
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Failed to load flows');
      }
      const data = await res.json();
      setFlows(data.flows || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchKnowledge = async () => {
    setFaqLoading(true);
    try {
      const res = await fetch('/api/ai/knowledge');
      const data = await res.json();
      if (data.success && data.data) {
        setFaqs(data.data.faqs || []);
        setGuardrails(data.data.guardrails || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFaqLoading(false);
    }
  };

  const handleSimulate = async (customPrompt?: string) => {
    const textToSend = customPrompt || simInput;
    if (!textToSend.trim() || simLoading) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSimMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setSimInput('');
    setSimLoading(true);

    try {
      const res = await fetch('/api/ai/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text })
      });
      const json = await res.json();

      if (json.success && json.data) {
        const botMsg = {
          sender: 'bot' as const,
          text: json.data.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSimMessages(prev => [...prev, botMsg]);
        setSimDiagnostic({
          detectedIntent: json.data.detectedIntent,
          engineUsed: json.data.engineUsed,
          latencyMs: json.data.latencyMs,
          guardrailsTriggered: json.data.guardrailsTriggered
        });
      } else {
        toast.error(json.error || 'Simulation failed');
      }
    } catch (err: any) {
      toast.error('Network error simulating message');
    } finally {
      setSimLoading(false);
    }
  };

  const handleAddFaq = async () => {
    if (!newFaqQ.trim() || !newFaqA.trim()) {
      toast.error('Question and Answer are required');
      return;
    }
    setSavingFaq(true);
    try {
      const updatedFaqs = [
        ...faqs,
        {
          id: `faq_${Date.now()}`,
          question: newFaqQ.trim(),
          answer: newFaqA.trim(),
          category: newFaqCategory,
          active: true
        }
      ];

      const res = await fetch('/api/ai/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faqs: updatedFaqs })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      setFaqs(updatedFaqs);
      setShowAddFaqModal(false);
      setNewFaqQ('');
      setNewFaqA('');
      toast.success('Custom Q&A added to AI Knowledge Base!');
    } catch (e: any) {
      toast.error(e.message || 'Error saving Q&A');
    } finally {
      setSavingFaq(false);
    }
  };

  const toggleJourney = (id: string) => {
    setJourneys(prev => prev.map(j => (j.id === id ? { ...j, active: !j.active } : j)));
    toast.success('Journey status updated');
  };

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) return;
    setCreating(true);
    try {
      const newFlow = {
        name: newFlowName.trim(),
        description: newFlowDesc.trim() || 'New automation flow',
        trigger_type: newFlowTrigger,
        trigger_config: newFlowTrigger === 'KEYWORD' ? { keywords: [] } : {},
        status: 'DRAFT' as const,
        definition: {
          nodes: [
            {
              id: 'trigger_1',
              type: 'trigger',
              position: { x: 300, y: 80 },
              data: {
                label: 'Flow Trigger',
                node_type: 'trigger',
                config: { keywords: ['hello', 'hi'] }
              }
            }
          ],
          edges: []
        }
      };

      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFlow)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create flow');

      toast.success('Flow created!');
      setShowCreateModal(false);
      setNewFlowName('');
      setNewFlowDesc('');
      fetchFlows();
      if (data.flow) {
        setActiveEditingFlow(data.flow);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#FAF7F2] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="AI Agent Studio & Automations"
          subtitle="24/7 Intelligent WhatsApp Concierge, Real-Time Testing Sandbox & Client Lifecycle Journeys."
          badge={
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] font-black text-emerald-700 tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              24/7 PEARL AI ACTIVE
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSimMessages([
                    {
                      sender: 'bot',
                      text: '✨ *Welcome to Classic Pearl Unisex Salon!* ✨\n\nI am Pearl Assistant, your 24/7 AI concierge. Ask me anything to test responses in real time! 💛',
                      time: '13:00'
                    }
                  ]);
                  setSimDiagnostic(null);
                  toast.success('Simulator reset');
                }}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Reset Sandbox
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddFaqModal(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Salon Q&A
              </Button>
            </div>
          }
        />

        {/* ── Tabs Navigation ── */}
        <div className="bg-white border-b border-[#E8DFC8] px-8 flex items-center justify-between shrink-0">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'simulator'
                  ? 'border-[#B08D57] text-[#B08D57]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Bot className="w-4 h-4" />
              AI Concierge & Live Simulator
            </button>

            <button
              onClick={() => setActiveTab('guardrails')}
              className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'guardrails'
                  ? 'border-[#B08D57] text-[#B08D57]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Guardrails & Knowledge Base
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-black">
                {faqs.length} FAQs
              </span>
            </button>

            <button
              onClick={() => setActiveTab('journeys')}
              className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'journeys'
                  ? 'border-[#B08D57] text-[#B08D57]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Flame className="w-4 h-4" />
              Smart Lifecycle Journeys
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-black">
                5 Auto
              </span>
            </button>

            <button
              onClick={() => setActiveTab('canvas')}
              className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'canvas'
                  ? 'border-[#B08D57] text-[#B08D57]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Visual Flow Canvas (Legacy)
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-black">
                {flows.length}
              </span>
            </button>
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: AI CONCIERGE & LIVE SIMULATOR
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'simulator' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT: Controls & Diagnostic Inspector (7 Cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-white border border-[#E8DFC8] rounded-2xl shadow-xs">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Response Speed</p>
                    <p className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      &lt; 15 ms
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">Zero-wait time</p>
                  </div>

                  <div className="p-4 bg-white border border-[#E8DFC8] rounded-2xl shadow-xs">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Safety Guardrails</p>
                    <p className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      100% Active
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Body Massage Refusal Active</p>
                  </div>

                  <div className="p-4 bg-white border border-[#E8DFC8] rounded-2xl shadow-xs">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Catalog Pricing</p>
                    <p className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#B08D57]" />
                      Zero Hallucination
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Direct from services.json</p>
                  </div>
                </div>

                {/* Quick Stress-Test Pills */}
                <div className="p-5 bg-white border border-[#E8DFC8] rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#B08D57]" />
                      One-Click Stress Tests
                    </p>
                    <span className="text-[10px] text-slate-400">Click any pill to test AI instantly</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_TESTS.map((test, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSimulate(test.prompt)}
                        disabled={simLoading}
                        className="px-3 py-1.5 rounded-xl border border-[#E8DFC8] bg-[#FAF7F2] hover:bg-[#B08D57]/10 hover:border-[#B08D57] text-[11px] font-bold text-slate-700 transition-all text-left flex items-center gap-1.5 shadow-2xs"
                      >
                        {test.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-Time Diagnostic Inspector */}
                <div className="p-5 bg-white border border-[#E8DFC8] rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E8DFC8] pb-3">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-[#B08D57]" />
                      Live AI Reasoning & Diagnostic Trace
                    </p>
                    {simDiagnostic && (
                      <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg">
                        {simDiagnostic.latencyMs} ms
                      </span>
                    )}
                  </div>

                  {!simDiagnostic ? (
                    <div className="text-center py-6 text-slate-400">
                      <Bot className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#B08D57]" />
                      <p className="text-xs">Type a message or click a test pill to inspect AI reasoning.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Detected Intent</span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {simDiagnostic.detectedIntent}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Engine Selected</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                          {simDiagnostic.engineUsed}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-slate-500 font-medium block">Guardrails Applied:</span>
                        <div className="flex flex-col gap-1">
                          {simDiagnostic.guardrailsTriggered.length > 0 ? (
                            simDiagnostic.guardrailsTriggered.map((g, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50/70 border border-emerald-100 px-2 py-1 rounded-lg"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                {g}
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Standard Concierge Routine</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: WhatsApp Device Simulator (5 Cols) */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-[340px] rounded-[36px] border-[6px] border-slate-800 bg-white shadow-2xl overflow-hidden flex flex-col h-[650px]">
                  {/* WhatsApp Top Bar */}
                  <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center font-serif font-black text-xs text-white shadow-xs">
                        CP
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight truncate">Classic Pearl Salon</p>
                        <p className="text-[9px] text-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          24/7 AI Concierge
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-100 font-medium">Simulator</div>
                  </div>

                  {/* WhatsApp Chat Bubbles */}
                  <div className="flex-1 bg-[#ECE5DD] p-3 overflow-y-auto space-y-3">
                    {simMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                            msg.sender === 'user'
                              ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-none'
                              : 'bg-white text-slate-900 rounded-tl-none border border-slate-200/50'
                          }`}
                        >
                          {msg.text}
                          <div className="flex justify-end items-center gap-1 mt-1">
                            <span className="text-[9px] text-slate-400">{msg.time}</span>
                            {msg.sender === 'user' && (
                              <span className="text-[#34B7F1] text-[9px] font-bold">✓✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {simLoading && (
                      <div className="flex items-start">
                        <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 text-xs text-slate-500 shadow-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#B08D57] animate-bounce"></span>
                          <span className="w-2 h-2 rounded-full bg-[#B08D57] animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-2 h-2 rounded-full bg-[#B08D57] animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Simulator Input Area */}
                  <div className="p-2.5 bg-[#F0F2F5] border-t border-slate-200 flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={simInput}
                      onChange={e => setSimInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSimulate()}
                      placeholder="Type a message as a client..."
                      className="flex-1 px-3 py-2 bg-white rounded-full text-xs text-slate-900 outline-none border border-slate-300 focus:border-[#B08D57]"
                    />
                    <button
                      onClick={() => handleSimulate()}
                      disabled={simLoading || !simInput.trim()}
                      className="w-8 h-8 rounded-full bg-[#075E54] text-white flex items-center justify-center shrink-0 hover:bg-[#064e46] transition-colors disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: GUARDRAILS & KNOWLEDGE BASE
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'guardrails' && (
            <div className="space-y-6">
              {/* Active Guardrails Grid */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Active Autonomous AI Guardrails (100% Enforced)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {guardrails.map((g, i) => (
                    <div
                      key={i}
                      className="p-4 bg-white border border-[#E8DFC8] rounded-2xl shadow-xs space-y-2 hover:border-[#B08D57] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{g.name}</span>
                        <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{g.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Salon Q&A Section */}
              <div className="bg-white border border-[#E8DFC8] rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8DFC8] pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Custom Salon Knowledge & FAQ Bank</h3>
                    <p className="text-xs text-slate-500">
                      Teach Pearl AI unique details about your salon (parking, payment modes, authentic brands, bridal packages).
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowAddFaqModal(true)}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Q&A
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {faqs.map((faq, i) => (
                    <div
                      key={faq.id || i}
                      className="p-4 bg-[#FAF7F2] border border-[#E8DFC8] rounded-xl space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#B08D57]">
                          {faq.category || 'General'}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Learned by AI
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">Q: {faq.question}</p>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        A: {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: SMART CLIENT LIFECYCLE JOURNEYS
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'journeys' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold">Automated Client Retention & Growth Journeys</h2>
                  <p className="text-xs text-amber-100 max-w-2xl leading-relaxed">
                    Unlike fragile manual flowcharts with complex wires, these battle-tested lifecycle journeys run reliably in the background based on client visits, rebooking cycles, and birthdays.
                  </p>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-2xl font-black">5 / 5</p>
                  <p className="text-[10px] uppercase tracking-wider text-amber-200">Active Automations</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {journeys.map((j) => (
                  <div
                    key={j.id}
                    className="p-5 bg-white border border-[#E8DFC8] rounded-2xl shadow-xs flex items-center justify-between gap-6 hover:border-[#B08D57] transition-all"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{j.title}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {j.active ? 'RUNNING 24/7' : 'PAUSED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{j.desc}</p>
                      <div className="flex items-center gap-4 text-[11px] pt-1">
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" /> {j.trigger}
                        </span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500" /> {j.stats}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => toggleJourney(j.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          j.active
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {j.active ? 'Active' : 'Paused'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: VISUAL FLOW CANVAS (LEGACY FLOW STUDIO)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'canvas' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white border border-[#E8DFC8] p-4 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Visual Flow Editor (Node Graph)</h3>
                  <p className="text-xs text-slate-500">
                    Legacy visual drag-and-drop flowchart builder for custom multi-branch keyword workflows.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Create Visual Flow
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-12 text-slate-400">Loading visual flows...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {flows.map((flow) => (
                    <div
                      key={flow.id}
                      className="p-5 bg-white border border-[#E8DFC8] rounded-2xl shadow-xs space-y-3 hover:border-[#B08D57] transition-all cursor-pointer"
                      onClick={() => setActiveEditingFlow(flow)}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[flow.status]}`}>
                          {flow.status}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {TRIGGER_LABELS[flow.trigger_type] || flow.trigger_type}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{flow.name}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{flow.description}</p>
                      </div>
                      <div className="pt-2 border-t border-[#E8DFC8] flex items-center justify-between text-xs text-[#B08D57] font-bold">
                        <span>Open Canvas</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Add Custom FAQ Modal ── */}
      <Modal
        isOpen={showAddFaqModal}
        onClose={() => setShowAddFaqModal(false)}
        title="Add Salon Q&A to AI Knowledge Bank"
        description="Pearl AI will memorize this answer and use it instantly to resolve client questions."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
            <select
              value={newFaqCategory}
              onChange={e => setNewFaqCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white outline-none focus:border-[#B08D57]"
            >
              <option value="Logistics">Logistics (Parking, Landmarks, Route)</option>
              <option value="Billing">Billing & Payment Modes (UPI, Cards, Cash)</option>
              <option value="Quality">Quality & Brands (L'Oréal, O3+, Rica Wax)</option>
              <option value="Services">Special Services (Bridal, Packages, Kids)</option>
              <option value="Policies">Salon Policies (Walk-ins, Bookings, Timings)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Customer Question</label>
            <input
              type="text"
              value={newFaqQ}
              onChange={e => setNewFaqQ(e.target.value)}
              placeholder="e.g. Is parking available?"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-[#B08D57]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Salon Answer</label>
            <textarea
              rows={4}
              value={newFaqA}
              onChange={e => setNewFaqA(e.target.value)}
              placeholder="e.g. Yes! Free dedicated parking is available right in front of the salon for cars and bikes."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-[#B08D57] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setShowAddFaqModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={savingFaq} onClick={handleAddFaq}>
              Save to AI
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Create Flow Modal ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Visual Automation Flow"
        description="Build a visual drag-and-drop flowchart."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Flow Name</label>
            <input
              type="text"
              value={newFlowName}
              onChange={e => setNewFlowName(e.target.value)}
              placeholder="e.g. Holiday Special Promo"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-[#B08D57]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Trigger Type</label>
            <select
              value={newFlowTrigger}
              onChange={e => setNewFlowTrigger(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white outline-none focus:border-[#B08D57]"
            >
              <option value="KEYWORD">Keyword Match</option>
              <option value="NEW_CONTACT">New Contact Inbound</option>
              <option value="APPOINTMENT_COMPLETED">Appointment Completed</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={creating} onClick={handleCreateFlow}>
              Create & Open
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Visual Flow Canvas Fullscreen Modal ── */}
      {activeEditingFlow && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
          <div className="flex-1 bg-[#FAF7F2]">
            <FlowCanvas
              initialFlow={activeEditingFlow.definition}
              flowName={activeEditingFlow.name}
              onClose={() => {
                setActiveEditingFlow(null);
                fetchFlows();
              }}
              onSave={async (newDef: FlowDefinition) => {
                try {
                  const res = await fetch(`/api/flows/${activeEditingFlow.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ definition: newDef })
                  });
                  if (!res.ok) throw new Error('Save failed');
                  toast.success('Flow saved successfully!');
                } catch (e: any) {
                  toast.error(e.message || 'Error saving flow');
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
