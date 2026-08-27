'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { 
  Search, 
  Send, 
  Phone, 
  MessageSquare, 
  Check, 
  CheckCheck, 
  Sparkles, 
  RefreshCw, 
  ArrowLeft,
  Tag,
  Info,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Video,
  X,
  Plus,
  Bell, 
  Trash2,
  UserCheck,
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  Zap,
  ExternalLink
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { normalizePhoneNumber, isValidWhatsAppNumber } from '@/utils/phone';

type ConversationStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
type StatusFilterType = 'ALL' | 'OPEN' | 'PENDING' | 'RESOLVED';
type AssignmentFilterType = 'all' | 'mine' | 'unassigned';

interface TeamMember {
  id: string;
  member_id: string;
  role: string;
  name: string;
}

interface ChatLabel {
  id: string;
  name: string;
  color: string;
}

export default function Inbox() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  
  // Luxury Filter States
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilterType>('all');
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [contactSearchResults, setContactSearchResults] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignment, setUpdatingAssignment] = useState(false);

  // New Conversation Modal State
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [newConvPhone, setNewConvPhone] = useState('');
  const [newConvName, setNewConvName] = useState('');
  const [newConvError, setNewConvError] = useState('');
  const [newConvLoading, setNewConvLoading] = useState(false);

  // Media Attachment State
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'document'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaSending, setMediaSending] = useState(false);

  // Notes & Quick Replies & Labels
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [labels, setLabels] = useState<ChatLabel[]>([]);
  const [activeLabels, setActiveLabels] = useState<string[]>([]);
  const [showLabelModal, setShowLabelModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch all conversations reliably
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.conversations)) {
          setConversations(json.conversations);
          return;
        }
      }
    } catch (e) {
      console.error('API fetch error, falling back to Supabase:', e);
    }

    const { data } = await supabase
      .from('conversations')
      .select('id, status, assigned_to, unread_count, last_message_at, contacts(id, name, phone_number, opted_in, created_at)')
      .order('last_message_at', { ascending: false });

    if (data) setConversations(data);
  }, []);

  // Fetch Team Members for Agent Assignment
  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/organization/members');
      if (res.ok) {
        const json = await res.json();
        setTeamMembers(json.members || []);
      }
    } catch (e) {
      console.error('Failed to fetch team members:', e);
    }
  }, []);

  // Fetch CRM Contacts for quick autocomplete
  const fetchContactsList = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('contacts')
        .select('id, name, phone_number, opted_in')
        .limit(300);
      if (data) setAllContacts(data);
    } catch (e) {}
  }, []);

  const deleteMessage = async (msgId: string) => {
    if (!window.confirm('Delete this message from your conversation view?')) return;
    try {
      const res = await fetch(`/api/messages/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
      }
    } catch (err) {}
  };

  const fetchMessagesForConv = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const json = await res.json();
        if (json.messages) {
          setMessages(json.messages);
          return;
        }
      }
    } catch (e) {
      console.error('Messages API error:', e);
    }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUser(data.user);
    });
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    fetchConversations();
    fetchTeamMembers();
    fetchContactsList();

    // Supabase Free Tier Optimization: Sync on tab focus + gentle 30s heartbeat only when visible
    const handleFocus = () => {
      fetchConversations();
    };
    window.addEventListener('focus', handleFocus);

    const heartbeat = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchConversations();
      }
    }, 30000);

    // Event-driven Realtime conversation stream (Zero DB polling overhead)
    const convChannel = supabase
      .channel('inbox-conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    // Event-driven Realtime message updates (Instant WebSocket delivery)
    const msgChannel = supabase
      .channel('inbox-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        fetchConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(heartbeat);
      supabase.removeChannel(convChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [fetchConversations, fetchTeamMembers, fetchContactsList]);

  useEffect(() => {
    if (activeConvId) {
      fetchMessagesForConv(activeConvId);
      fetchActiveConvLabels(activeConvId);

      // Instant optimistic clear of unread count on view
      setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, unread_count: 0 } : c));
      
      // Mark as read on server & Meta
      fetch(`/api/conversations/${activeConvId}/read`, { method: 'POST' }).catch(()=>{});
    } else {
      setMessages([]);
    }
  }, [activeConvId, fetchMessagesForConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConvId]);

  const fetchQuickReplies = async () => {
    try {
      const res = await fetch('/api/quick-replies');
      if (res.ok) {
        const json = await res.json();
        setQuickReplies(json.quick_replies || []);
      }
    } catch(e) {}
  };

  const fetchLabels = async () => {
    try {
      const res = await fetch('/api/labels');
      if (res.ok) {
        const json = await res.json();
        setLabels(json.labels || []);
      }
    } catch(e) {}
  };

  const fetchActiveConvLabels = async (convId: string) => {
    try {
      const { data } = await supabase
        .from('conversation_labels')
        .select('label_id')
        .eq('conversation_id', convId);
      if (data) {
        setActiveLabels(data.map(d => d.label_id));
      }
    } catch(e) {}
  };

  useEffect(() => {
    fetchQuickReplies();
    fetchLabels();
  }, []);

  // Update Conversation Status (OPEN / PENDING / RESOLVED)
  const updateConversationStatus = async (newStatus: ConversationStatus) => {
    if (!activeConvId || updatingStatus) return;
    setUpdatingStatus(true);
    
    // Optimistic UI update
    setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, status: newStatus } : c));

    try {
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) fetchConversations();
    } catch (e) {
      console.error('Failed to update status:', e);
      fetchConversations();
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Update Conversation Agent Assignment
  const updateConversationAssignment = async (assignedToId: string | null) => {
    if (!activeConvId || updatingAssignment) return;
    setUpdatingAssignment(true);

    // Optimistic UI update
    setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, assigned_to: assignedToId } : c));

    try {
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: assignedToId })
      });
      if (!res.ok) fetchConversations();
    } catch (e) {
      console.error('Failed to update assignment:', e);
      fetchConversations();
    } finally {
      setUpdatingAssignment(false);
    }
  };

  // Filtered conversations list according to status, assignment, label, and search
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      // 1. Status Filter
      if (statusFilter !== 'ALL') {
        const convStatus = (c.status || 'OPEN').toUpperCase();
        if (convStatus !== statusFilter) return false;
      }

      // 2. Assignment Filter
      if (assignmentFilter === 'unassigned' && c.assigned_to) return false;
      if (assignmentFilter === 'mine' && currentUser && c.assigned_to !== currentUser.id) return false;

      // 3. Label Filter
      if (selectedLabelId) {
        const convLabels = c.conversation_labels || [];
        const hasLabel = convLabels.some((l: any) => l.label_id === selectedLabelId || l.chat_labels?.id === selectedLabelId);
        if (!hasLabel) return false;
      }

      // 4. Search Filter
      if (search) {
        const name = c.contacts?.name?.toLowerCase() || '';
        const phone = c.contacts?.phone_number?.toLowerCase() || '';
        const q = search.toLowerCase();
        return name.includes(q) || phone.includes(q);
      }

      return true;
    });
  }, [conversations, statusFilter, assignmentFilter, selectedLabelId, search, currentUser]);

  const activeConv = conversations.find(c => c.id === activeConvId);

  const sendMessage = async () => {
    if (!inputText.trim() || !activeConvId || !activeConv || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setSending(true);

    try {
      if (isInternalNote) {
        const res = await fetch(`/api/conversations/${activeConvId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: textToSend })
        });
        if (res.ok) {
          fetchMessagesForConv(activeConvId);
          setIsInternalNote(false);
        }
      } else {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: activeConv.contacts.id,
            text: textToSend
          })
        });
        if (res.ok) {
          fetchMessagesForConv(activeConvId);
        }
      }
    } catch (err) {
      console.error("Error sending", err);
    } finally {
      setSending(false);
    }
  };

  const toggleLabel = async (labelId: string) => {
    if (!activeConvId) return;
    const isAssigned = activeLabels.includes(labelId);
    
    try {
      if (isAssigned) {
        await fetch(`/api/conversations/${activeConvId}/labels?label_id=${labelId}`, { method: 'DELETE' });
        setActiveLabels(prev => prev.filter(id => id !== labelId));
      } else {
        await fetch(`/api/conversations/${activeConvId}/labels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label_id: labelId })
        });
        setActiveLabels(prev => [...prev, labelId]);
      }
      fetchConversations();
    } catch(e) {}
  };

  // Start new conversation dialog handler with normalization & duplicate check
  const startNewConversation = async (phoneToUse?: string, nameToUse?: string) => {
    const rawPhone = phoneToUse || newConvPhone;
    const contactName = nameToUse || newConvName;

    if (!rawPhone.trim()) {
      setNewConvError('Phone number is required.');
      return;
    }

    const normalized = normalizePhoneNumber(rawPhone.trim());
    if (!isValidWhatsAppNumber(normalized)) {
      setNewConvError('Please enter a valid WhatsApp phone number with country code (e.g. +91XXXXXXXXXX).');
      return;
    }

    setNewConvLoading(true);
    setNewConvError('');

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone_number: normalized, 
          name: contactName.trim() || undefined 
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setNewConvError(data.error || 'Failed to open conversation.');
        return;
      }

      setShowNewConvModal(false);
      setNewConvPhone('');
      setNewConvName('');
      setContactSearchResults([]);
      await fetchConversations();
      setActiveConvId(data.conversation_id);
    } catch (e: any) {
      setNewConvError(e.message || 'Network error.');
    } finally {
      setNewConvLoading(false);
    }
  };

  // Live search for contacts inside New Chat Modal
  const handleNewConvPhoneChange = (val: string) => {
    setNewConvPhone(val);
    setNewConvError('');
    if (!val.trim()) {
      setContactSearchResults([]);
      return;
    }
    const q = val.toLowerCase().replace(/\D/g, '');
    const textQ = val.toLowerCase();
    const matches = allContacts.filter(c => {
      const p = (c.phone_number || '').replace(/\D/g, '');
      const n = (c.name || '').toLowerCase();
      return (q && p.includes(q)) || n.includes(textQ);
    }).slice(0, 5);
    setContactSearchResults(matches);
  };

  const toggleOptIn = async () => {
    if (!activeConv?.contacts?.id) return;
    const newStatus = !activeConv.contacts.opted_in;
    await supabase.from('contacts').update({ opted_in: newStatus }).eq('id', activeConv.contacts.id);
    fetchConversations();
  };

  return (
    <div className="flex h-screen bg-[#06080F] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <Sidebar className="hidden md:flex" />

      <main className="flex-1 flex overflow-hidden min-w-0">
        
        {/* Pane 1: Luxury Conversations List & Filters */}
        <div className={`w-full md:w-[350px] lg:w-[380px] border-r border-slate-800/90 flex flex-col bg-[#0B0F19] shrink-0 ${
          activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header & Main Toolbar */}
          <div className="p-4 border-b border-slate-800 bg-[#080C14] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Conversations</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-black border border-slate-700">
                    {filteredConversations.length}
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Classic Pearls Salon WhatsApp</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={fetchConversations} 
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Refresh conversations"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { 
                    setShowNewConvModal(true); 
                    setNewConvError(''); 
                    setNewConvPhone(''); 
                    setNewConvName(''); 
                    setContactSearchResults([]);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-indigo-600/30 active:scale-95"
                  title="Start a new chat"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Chat
                </button>
              </div>
            </div>

            {/* Status Tabs: ALL / OPEN / PENDING / RESOLVED */}
            <div className="flex bg-[#05070D] p-1 rounded-xl border border-slate-800">
              {(['ALL', 'OPEN', 'PENDING', 'RESOLVED'] as const).map((st) => (
                <button 
                  key={st}
                  onClick={() => setStatusFilter(st)} 
                  className={`flex-1 text-[11px] font-black py-1.5 rounded-lg transition-all cursor-pointer capitalize ${
                    statusFilter === st 
                      ? 'bg-slate-800 text-white shadow-xs border border-slate-700 font-black' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.toLowerCase()}
                </button>
              ))}
            </div>

            {/* Secondary Filter: All / Mine / Unassigned */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setAssignmentFilter('all')}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    assignmentFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  All Staff
                </button>
                <button 
                  onClick={() => setAssignmentFilter('mine')}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    assignmentFilter === 'mine' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/60' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Assigned to Me
                </button>
                <button 
                  onClick={() => setAssignmentFilter('unassigned')}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    assignmentFilter === 'unassigned' ? 'bg-amber-950 text-amber-300 border border-amber-800/60' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Unassigned
                </button>
              </div>
            </div>

            {/* Dynamic Label Filter Pills */}
            {labels.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
                <button
                  onClick={() => setSelectedLabelId(null)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedLabelId === null
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  All Labels
                </button>
                {labels.map((lbl) => {
                  const isSelected = selectedLabelId === lbl.id;
                  return (
                    <button
                      key={lbl.id}
                      onClick={() => setSelectedLabelId(isSelected ? null : lbl.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-950 text-indigo-200 shadow-xs'
                          : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lbl.color || '#6366f1' }} />
                      {lbl.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, phone, message..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#05070D] border border-slate-800 rounded-lg text-xs font-semibold text-white focus:bg-[#0B0F19] focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Conversation List Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {filteredConversations.map((conv) => {
              const isActive = activeConvId === conv.id;
              const contactName = conv.contacts?.name || 'Customer';
              const phone = conv.contacts?.phone_number || '-';
              const status = (conv.status || 'OPEN').toUpperCase();
              const convLabels = conv.conversation_labels || [];
              const hasUnread = (conv.unread_count || 0) > 0;

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-3.5 cursor-pointer transition-colors duration-150 relative ${
                    isActive 
                      ? 'bg-slate-800/90 border-l-4 border-indigo-500 shadow-md' 
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={contactName} size="md" status={hasUnread ? 'online' : undefined} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-extrabold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                          {contactName}
                        </p>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
                        <span className="truncate flex items-center gap-1 text-[11px] font-semibold">
                          <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                          {phone}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {status === 'RESOLVED' ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              Resolved
                            </span>
                          ) : status === 'PENDING' ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800/50">
                              Pending
                            </span>
                          ) : null}

                          {hasUnread && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-md shadow-emerald-500/40 animate-pulse">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display Assigned Labels Chips */}
                      {convLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {convLabels.slice(0, 3).map((cl: any) => {
                            const lbl = cl.chat_labels || labels.find(l => l.id === cl.label_id);
                            if (!lbl) return null;
                            return (
                              <span
                                key={lbl.id}
                                className="px-1.5 py-0.2 rounded text-[9px] font-bold text-slate-200 bg-slate-800/80 border border-slate-700/80"
                              >
                                {lbl.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredConversations.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-bold text-slate-300">No conversations in this view</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Click "New Chat" to start messaging a client.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pane 2: Active Chat Canvas */}
        <div className={`flex-1 flex flex-col bg-[#080C14] min-w-0 ${
          !activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConv ? (
            <>
              {/* Active Conversation Header */}
              <header className="px-6 py-3.5 border-b border-slate-800 bg-[#0B0F19] flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <Avatar name={activeConv.contacts?.name} size="md" />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-white truncate">
                        {activeConv.contacts?.name || 'Unknown Contact'}
                      </h2>
                      {activeConv.contacts?.opted_in === false && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800 shrink-0">
                          Opted Out
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                      {activeConv.contacts?.phone_number}
                    </p>
                  </div>
                </div>

                {/* Status Dropdown, Agent Assignment Dropdown & Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  
                  {/* Status Dropdown */}
                  <div className="flex items-center bg-[#05070D] border border-slate-700 rounded-lg px-2.5 py-1">
                    <span className="text-[11px] font-bold text-slate-400 mr-1.5 hidden sm:inline">Status:</span>
                    <select
                      value={(activeConv.status || 'OPEN').toUpperCase()}
                      onChange={(e) => updateConversationStatus(e.target.value as ConversationStatus)}
                      disabled={updatingStatus}
                      className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                    >
                      <option value="OPEN" className="bg-[#0D131F] text-emerald-400">Open</option>
                      <option value="PENDING" className="bg-[#0D131F] text-amber-400">Pending</option>
                      <option value="RESOLVED" className="bg-[#0D131F] text-slate-400">Resolved</option>
                    </select>
                  </div>

                  {/* Agent Assignment Selector */}
                  <div className="flex items-center bg-[#05070D] border border-slate-700 rounded-lg px-2.5 py-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 mr-1.5 hidden sm:inline" />
                    <select
                      value={activeConv.assigned_to || ''}
                      onChange={(e) => updateConversationAssignment(e.target.value || null)}
                      disabled={updatingAssignment}
                      className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer max-w-[120px] truncate"
                    >
                      <option value="" className="bg-[#0D131F] text-slate-400">Unassigned</option>
                      {currentUser && (
                        <option value={currentUser.id} className="bg-[#0D131F] text-indigo-400">
                          Assign to Me
                        </option>
                      )}
                      {teamMembers.filter(m => m.id !== currentUser?.id).map((member) => (
                        <option key={member.id} value={member.id} className="bg-[#0D131F] text-white">
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Labels Toggle Button */}
                  <button
                    onClick={() => setShowLabelModal(true)}
                    className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Manage labels"
                  >
                    <Tag className="w-4 h-4" />
                  </button>

                  {/* Customer Profile Drawer Toggle */}
                  <button
                    onClick={() => setShowCustomerDrawer(!showCustomerDrawer)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      showCustomerDrawer ? 'bg-indigo-950 text-indigo-300 border-indigo-600' : 'text-slate-400 hover:text-white border-slate-700 hover:bg-slate-800'
                    }`}
                    title="Customer profile details"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {/* Chat Canvas with Ultra Luxury Wallpaper */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 wa-chat-bg">
                <div className="text-center my-1">
                  <span className="bg-[#0B0F19]/90 px-3 py-1 rounded-full text-[10px] font-bold text-slate-400 border border-slate-800 shadow-sm">
                    Classic Pearl Unisex Salon • WhatsApp Business Encrypted
                  </span>
                </div>

                {messages.map((msg) => {
                  const isInbound = msg.direction === 'INBOUND';
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  const isImage = msg.type === 'image';
                  const isVideo = msg.type === 'video';
                  const isDocument = msg.type === 'document';
                  const isTemplate = msg.type === 'template';
                  const isNote = msg.type === 'internal_note';
                  
                  const imageUrl = isImage ? (msg.content?.image?.link || msg.content?.image?.url) : (isTemplate ? (msg.content?.template?.header_image || msg.content?.image?.url) : null);
                  const caption = msg.content?.[msg.type]?.caption || (isTemplate ? (msg.content?.template?.body_text || msg.content?.text?.body) : msg.content?.text?.body);
                  const templateButtons = msg.content?.template?.buttons || [];

                  return (
                    <div
                      key={msg.id}
                      className={`flex group ${isNote ? 'justify-end' : (isInbound ? 'justify-start' : 'justify-end')}`}
                    >
                      <div
                        className={`max-w-[78%] sm:max-w-[65%] rounded-2xl p-3 shadow-md space-y-2 relative ${
                          isNote
                            ? 'bg-gradient-to-r from-amber-950/90 to-amber-900/80 text-amber-200 border border-amber-600/50 rounded-tr-xs'
                            : isInbound
                            ? 'bg-[#121927] text-white rounded-tl-xs border border-slate-700/80 shadow-md shadow-black/30'
                            : 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-tr-xs shadow-md shadow-emerald-950/40'
                        }`}
                      >
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className={`absolute top-2 ${isInbound ? '-right-7' : '-left-7'} opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all cursor-pointer z-10`}
                          title="Delete for me"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {isNote && (
                          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-300 mb-0.5">
                            <Tag className="w-3 h-3" />
                            Internal Staff Note
                          </div>
                        )}

                        {/* Image / Template Header Media */}
                        {imageUrl && (
                          <div className="rounded-xl overflow-hidden max-h-72 bg-black/40 border border-white/10 shadow-xs">
                            <img src={imageUrl} alt="WhatsApp Image" className="w-full h-full object-cover" />
                          </div>
                        )}

                        {isVideo && (
                          <div className="p-3 bg-black/40 text-white rounded-xl flex items-center gap-2.5">
                            <Video className="w-5 h-5 text-white/80" />
                            <span className="text-xs font-bold">Video Message</span>
                          </div>
                        )}

                        {isDocument && (
                          <div className="p-2.5 bg-black/30 rounded-xl flex items-center gap-2">
                            <FileText className="w-4 h-4 text-rose-400" />
                            <span className="text-xs font-bold truncate">Document Attachment</span>
                          </div>
                        )}

                        {/* Text / Caption Content */}
                        {isNote ? (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {msg.content?.internal_note?.body || msg.content}
                          </p>
                        ) : caption ? (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {caption}
                          </p>
                        ) : null}

                        {/* Interactive Template Buttons */}
                        {isTemplate && templateButtons.length > 0 && (
                          <div className="pt-2 border-t border-white/15 space-y-1.5">
                            {templateButtons.map((btn: any, bIdx: number) => (
                              <div
                                key={bIdx}
                                className="w-full py-1.5 px-3 rounded-lg bg-black/25 text-center text-xs font-bold text-emerald-200 border border-emerald-400/30 flex items-center justify-center gap-1.5 shadow-xs"
                              >
                                {btn.type === 'PHONE_NUMBER' ? (
                                  <Phone className="w-3 h-3 text-emerald-300" />
                                ) : (
                                  <ExternalLink className="w-3 h-3 text-emerald-300" />
                                )}
                                <span>{btn.text || btn.phone_number || 'Action Button'}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-1 text-[10px] text-slate-300 font-bold pt-0.5">
                          <span>{time}</span>
                          {!isInbound && !isNote && (
                            <span>
                              {msg.status === 'READ' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                              ) : msg.status === 'DELIVERED' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-300" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Composer with WhatsApp Multiline Shift+Enter Support */}
              <div className="p-4 bg-[#0B0F19] border-t border-slate-800">
                
                {/* Note Indicator Banner */}
                {isInternalNote && (
                  <div className="mb-2 px-3 py-1.5 bg-amber-950/90 border border-amber-600/50 rounded-lg flex items-center justify-between text-xs text-amber-200 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Writing an Internal Staff Note (Customer will NOT receive this)
                    </span>
                    <button onClick={() => setIsInternalNote(false)} className="text-amber-400 hover:text-white cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2 bg-[#05070D] border border-slate-700/90 p-2 rounded-xl focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all shadow-md">
                  
                  {/* Media Attachment Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowMediaModal(true)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer mb-0.5"
                    title="Attach Image, Video, or Document"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Quick Replies Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies(true)}
                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer mb-0.5"
                    title="Quick Replies"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  {/* Internal Note Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(!isInternalNote)}
                    className={`p-2 rounded-lg transition-colors cursor-pointer mb-0.5 ${
                      isInternalNote ? 'bg-amber-950 text-amber-300 border border-amber-600' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                    }`}
                    title="Toggle Internal Staff Note"
                  >
                    <Tag className="w-4 h-4" />
                  </button>

                  {/* Multiline WhatsApp Textarea (Enter sends, Shift+Enter newlines) */}
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={isInternalNote ? "Write an internal note for team members..." : "Type a message (Shift+Enter for new line)..."}
                    className="flex-1 bg-transparent border-none px-2 py-1.5 text-sm outline-none font-medium text-white placeholder:text-slate-500 resize-none max-h-32 min-h-[36px]"
                  />

                  <Button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending}
                    size="sm"
                    variant={isInternalNote ? "warning" : "primary"}
                    className="rounded-lg px-4 py-2 mb-0.5"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#06080F]">
              <div className="w-14 h-14 rounded-2xl bg-[#0D131F] border border-slate-800 flex items-center justify-center text-slate-400 mb-3 shadow-md">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-white">Select a Conversation</h3>
              <p className="text-xs text-slate-400 font-medium max-w-sm mt-1">
                Choose a customer from the left sidebar or click "New Chat" above to start messaging.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => { 
                  setShowNewConvModal(true); 
                  setNewConvError(''); 
                  setNewConvPhone(''); 
                  setNewConvName(''); 
                  setContactSearchResults([]);
                }}
              >
                <Plus className="w-4 h-4" />
                Start New Chat
              </Button>
            </div>
          )}
        </div>

        {/* Pane 3: Customer Profile Drawer */}
        {showCustomerDrawer && activeConv && (
          <div className="w-[300px] border-l border-slate-800 bg-[#0B0F19] p-6 overflow-y-auto space-y-6 shrink-0 hidden lg:block animate-in slide-in-from-right duration-150">
            <div className="text-center pb-5 border-b border-slate-800">
              <Avatar name={activeConv.contacts?.name} size="xl" className="mx-auto mb-3" />
              <h3 className="text-sm font-black text-white">{activeConv.contacts?.name || 'Customer'}</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">{activeConv.contacts?.phone_number}</p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Marketing Consent</h4>
              <div className="p-3 rounded-xl bg-[#05070D] border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {activeConv.contacts?.opted_in !== false ? 'Opted In' : 'Opted Out'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {activeConv.contacts?.opted_in !== false ? 'Receives promotional broadcasts' : 'Excluded from marketing broadcasts'}
                  </span>
                </div>
                <button
                  onClick={toggleOptIn}
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
                    activeConv.contacts?.opted_in !== false ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Details</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Created At</span>
                  <span className="font-bold text-white">
                    {new Date(activeConv.contacts?.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Status</span>
                  <span className="font-extrabold text-emerald-400">
                    {activeConv.status || 'OPEN'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* + START NEW CHAT MODAL with Contact Search & Duplicate Prevention */}
      <Modal
        isOpen={showNewConvModal}
        onClose={() => setShowNewConvModal(false)}
        title="Start WhatsApp Conversation"
        description="Search an existing customer or type a new WhatsApp number with country code."
      >
        <div className="space-y-4">
          <div>
            <Input
              label="Customer Phone Number *"
              placeholder="+91XXXXXXXXXX"
              value={newConvPhone}
              onChange={(e) => handleNewConvPhoneChange(e.target.value)}
              helperText="Include country code (e.g. +91XXXXXXXXXX)."
            />

            {/* Autocomplete Suggestions */}
            {contactSearchResults.length > 0 && (
              <div className="mt-2 bg-[#05070D] border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 shadow-md">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  Matching Existing Contacts
                </div>
                {contactSearchResults.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setNewConvPhone(c.phone_number);
                      setNewConvName(c.name || '');
                      startNewConversation(c.phone_number, c.name);
                    }}
                    className="p-2.5 hover:bg-slate-850 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{c.name || 'Valued Customer'}</p>
                      <p className="text-[11px] text-slate-400">{c.phone_number}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded-full border border-emerald-800/40">Existing</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Input
            label="Customer Name (Optional for new contacts)"
            placeholder="e.g. Priya Sharma"
            value={newConvName}
            onChange={(e) => setNewConvName(e.target.value)}
            helperText="Name to save for this contact in the CRM."
          />

          {newConvError && (
            <div className="p-3 bg-rose-950/80 border border-rose-800/60 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {newConvError}
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setShowNewConvModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={newConvLoading}
              disabled={!newConvPhone.trim()}
              onClick={() => startNewConversation()}
              leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
            >
              Open Conversation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Label Management Modal */}
      <Modal
        isOpen={showLabelModal}
        onClose={() => setShowLabelModal(false)}
        title="Manage Conversation Labels"
        description="Select labels to attach or remove from this conversation."
      >
        <div className="space-y-2">
          {labels.length === 0 ? (
            <div className="text-sm text-slate-400">No labels created yet.</div>
          ) : (
            labels.map(lbl => {
              const isActive = activeLabels.includes(lbl.id);
              return (
                <button
                  key={lbl.id}
                  onClick={() => toggleLabel(lbl.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive ? 'border-indigo-500 bg-indigo-950/60' : 'border-slate-800 hover:border-slate-700 bg-[#05070D]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lbl.color || '#6366f1' }} />
                    <span className="text-sm font-bold text-white">{lbl.name}</span>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
              );
            })
          )}
        </div>
      </Modal>

      {/* Quick Replies Modal */}
      <Modal
        isOpen={showQuickReplies}
        onClose={() => setShowQuickReplies(false)}
        title="Quick Replies"
        description="Select a canned response to insert into the message composer."
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {quickReplies.length === 0 ? (
            <div className="text-sm text-slate-400">No quick replies found.</div>
          ) : (
            quickReplies.map(qr => (
              <div
                key={qr.id}
                onClick={() => {
                  setInputText(qr.content);
                  setShowQuickReplies(false);
                }}
                className="p-3 bg-[#05070D] border border-slate-800 rounded-xl hover:border-indigo-500 hover:bg-slate-900 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{qr.title}</span>
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded">
                    /{qr.shortcut}
                  </span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2">{qr.content}</p>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Attach Media Modal */}
      <Modal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        title="Send WhatsApp Media"
        description="Attach an image, video, or document URL to send directly."
      >
        <div className="space-y-4">
          <div className="flex bg-[#05070D] p-1 rounded-xl border border-slate-800">
            {(['image', 'video', 'document'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMediaType(t)}
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                  mediaType === t ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <Input
            label="Public HTTPS Media URL *"
            placeholder={`https://your-domain.com/assets/${mediaType === 'image' ? 'photo.jpg' : mediaType === 'video' ? 'video.mp4' : 'catalog.pdf'}`}
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            helperText="Direct public HTTPS link accessible by WhatsApp servers."
            required
          />

          <Input
            label="Message Caption (Optional)"
            placeholder="Add a caption..."
            value={mediaCaption}
            onChange={(e) => setMediaCaption(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setShowMediaModal(false)}>
              Cancel
            </Button>
            <Button
              variant="whatsapp"
              size="sm"
              isLoading={mediaSending}
              disabled={!mediaUrl.trim()}
              onClick={async () => {
                if (!activeConv || mediaSending || !mediaUrl.trim()) return;
                setMediaSending(true);
                try {
                  const res = await fetch('/api/whatsapp/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contactId: activeConv.contacts.id,
                      mediaType: mediaType,
                      mediaUrl: mediaUrl.trim(),
                      caption: mediaCaption.trim() || undefined
                    })
                  });
                  if (res.ok) {
                    setShowMediaModal(false);
                    setMediaUrl('');
                    setMediaCaption('');
                    fetchMessagesForConv(activeConv.id);
                  }
                } finally {
                  setMediaSending(false);
                }
              }}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send Media
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
