'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaUploader, MediaUploadValue } from "@/components/ui/MediaUploader";
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
  const [mediaUpload, setMediaUpload] = useState<MediaUploadValue | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaSending, setMediaSending] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

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

    // Auto-select conversation if redirected from Contacts CRM with ?id= or ?phone=
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('id');
      const urlPhone = urlParams.get('phone');
      if (urlId) {
        setActiveConvId(urlId);
      } else if (urlPhone) {
        const cleanP = urlPhone.replace(/\D/g, '');
        fetch('/api/conversations')
          .then(res => res.json())
          .then(json => {
            const list = json.conversations || [];
            const match = list.find((c: any) => (c.contacts?.phone_number || '').replace(/\D/g, '').includes(cleanP));
            if (match) {
              setActiveConvId(match.id);
            }
          })
          .catch(() => {});
      }
    }

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

    // Event-driven Realtime message updates — only for the active conversation
    const msgChannel = supabase
      .channel('inbox-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // Only append to current view if the message belongs to the active conversation
        setMessages((prev) => {
          const activeId = activeConvId; // captured from closure — may be null initially
          if (!activeId || payload.new.conversation_id !== activeId) {
            // Still refresh the conversation list so unread counts update
            fetchConversations();
            return prev;
          }
          if (prev.some(m => m.id === payload.new.id || m.id?.startsWith('optimistic_'))) {
            // Deduplicate: remove any optimistic placeholder then add the real message
            return [...prev.filter(m => !m.id?.startsWith('optimistic_')), payload.new];
          }
          fetchConversations();
          return [...prev, payload.new];
        });
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
        // Optimistic insert for internal notes
        const optimisticNote = {
          id: `optimistic_${Date.now()}`,
          conversation_id: activeConvId,
          direction: 'OUTBOUND',
          type: 'internal_note',
          content: { internal_note: { body: textToSend } },
          status: 'SENT',
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticNote]);

        const res = await fetch(`/api/conversations/${activeConvId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: textToSend })
        });
        if (res.ok) {
          setIsInternalNote(false);
          // Replace optimistic with real after short delay
          setTimeout(() => fetchMessagesForConv(activeConvId), 800);
        } else {
          // Rollback optimistic on failure
          setMessages(prev => prev.filter(m => m.id !== optimisticNote.id));
        }
      } else {
        // Optimistic insert for outbound text messages — appears instantly
        const optimisticMsg = {
          id: `optimistic_${Date.now()}`,
          conversation_id: activeConvId,
          direction: 'OUTBOUND',
          type: 'text',
          content: { text: { body: textToSend } },
          status: 'SENT',
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);

        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: activeConv.contacts.id,
            text: textToSend
          })
        });
        if (res.ok) {
          // Replace optimistic with real server record after short delay
          setTimeout(() => fetchMessagesForConv(activeConvId), 1000);
        } else {
          // Rollback on failure
          setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        }
      }
    } catch (err) {
      console.error('Error sending', err);
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
    <div className="flex h-screen bg-[#F8F5EF] text-[#1E1B18] font-sans antialiased selection:bg-indigo-500 selection:text-[#292722]">
      <Sidebar className="hidden md:flex" />

      <main className="flex-1 flex overflow-hidden min-w-0">
        
        {/* Pane 1: Luxury Conversations List & Filters */}
        <div className={`w-full md:w-[350px] lg:w-[380px] border-r border-[#E5DED2]/90 flex flex-col bg-[#FFFDFC] shrink-0 ${
          activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header & Main Toolbar */}
          <div className="p-4 border-b border-[#E5DED2] bg-[#F1ECE3] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black text-[#292722] tracking-tight flex items-center gap-2">
                  <span>Conversations</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white shadow-sm text-[#5D564E] font-black border border-[#DFBE7E]/60">
                    {filteredConversations.length}
                  </span>
                </h1>
                <p className="text-[11px] text-[#706B61] font-medium mt-0.5">Classic Pearl Salon WhatsApp</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={fetchConversations} 
                  className="p-2 text-[#706B61] hover:text-[#292722] hover:bg-white shadow-sm rounded-lg transition-colors cursor-pointer"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#B08D57] to-[#8C6514] hover:from-[#D6B878] hover:to-[#B08D57] text-[#292722] text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-[#B08D57]/30 active:scale-95"
                  title="Start a new chat"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Chat
                </button>
              </div>
            </div>

            {/* Status Tabs: ALL / OPEN / PENDING / RESOLVED */}
            <div className="flex bg-[#E5DED2] p-1 rounded-xl border border-[#E5DED2]">
              {(['ALL', 'OPEN', 'PENDING', 'RESOLVED'] as const).map((st) => (
                <button 
                  key={st}
                  onClick={() => setStatusFilter(st)} 
                  className={`flex-1 text-[11px] font-black py-1.5 rounded-lg transition-all cursor-pointer capitalize ${
                    statusFilter === st 
                      ? 'bg-white shadow-sm text-[#292722] shadow-xs border border-[#DFBE7E]/60 font-black' 
                      : 'text-[#706B61] hover:text-[#2C2723]'
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
                    assignmentFilter === 'all' ? 'bg-white shadow-sm text-[#292722]' : 'text-[#706B61] hover:text-[#5D564E]'
                  }`}
                >
                  All Staff
                </button>
                <button 
                  onClick={() => setAssignmentFilter('mine')}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    assignmentFilter === 'mine' ? 'bg-[#F1ECE3] text-[#B08D57] border border-[#B08D57]/40' : 'text-[#706B61] hover:text-[#5D564E]'
                  }`}
                >
                  Assigned to Me
                </button>
                <button 
                  onClick={() => setAssignmentFilter('unassigned')}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    assignmentFilter === 'unassigned' ? 'bg-amber-950 text-amber-300 border border-amber-800/60' : 'text-[#706B61] hover:text-[#5D564E]'
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
                      ? 'bg-white shadow-sm text-[#292722] border border-[#DFBE7E]/60'
                      : 'bg-[#FAF7F2] text-[#706B61] hover:bg-white shadow-sm hover:text-[#2C2723] border border-[#E5DED2]'
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
                          ? 'border-indigo-400 bg-[#F1ECE3] text-indigo-200 shadow-xs'
                          : 'border-[#E5DED2] bg-[#F2ECE0]/50 text-[#5D564E] hover:border-[#DFBE7E]/60'
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
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#706B61]" />
                <input
                  type="text"
                  placeholder="Search name, phone, message..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#E5DED2] border border-[#E5DED2] rounded-lg text-xs font-semibold text-[#292722] focus:bg-[#FFFDFC] focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none placeholder:text-[#9E968D]"
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
                      ? 'bg-white shadow-sm/90 border-l-4 border-indigo-500 shadow-md' 
                      : 'hover:bg-white shadow-sm/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={contactName} size="md" status={hasUnread ? 'online' : undefined} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-extrabold truncate ${isActive ? 'text-[#292722]' : 'text-[#2C2723]'}`}>
                          {contactName}
                        </p>
                        <span className="text-[10px] font-bold text-[#706B61] shrink-0">
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#706B61] font-medium mb-1">
                        <span className="truncate flex items-center gap-1 text-[11px] font-semibold">
                          <Phone className="w-3 h-3 text-[#3F7D58] shrink-0" />
                          {phone}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {status === 'RESOLVED' ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white shadow-sm text-[#706B61] border border-[#DFBE7E]/60">
                              Resolved
                            </span>
                          ) : status === 'PENDING' ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800/50">
                              Pending
                            </span>
                          ) : null}

                          {hasUnread && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-[#292722] text-[10px] font-black shadow-md shadow-emerald-500/40 animate-pulse">
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
                                className="px-1.5 py-0.2 rounded text-[9px] font-bold text-[#2C2723] bg-white shadow-sm/80 border border-[#DFBE7E]/60/80"
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
              <div className="p-12 text-center text-[#9E968D]">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#706B61]" />
                <p className="text-xs font-bold text-[#5D564E]">No conversations in this view</p>
                <p className="text-[11px] text-[#9E968D] mt-0.5">Click "New Chat" to start messaging a client.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pane 2: Active Chat Canvas */}
        <div className={`flex-1 flex flex-col bg-[#F1ECE3] min-w-0 ${
          !activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConv ? (
            <>
              {/* Active Conversation Header */}
              <header className="px-6 py-3.5 border-b border-[#E5DED2] bg-[#FFFDFC] flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-1.5 text-[#706B61] hover:text-[#292722] rounded-lg cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <Avatar name={activeConv.contacts?.name} size="md" />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-[#292722] truncate">
                        {activeConv.contacts?.name || 'Unknown Contact'}
                      </h2>
                      {activeConv.contacts?.opted_in === false && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800 shrink-0">
                          Opted Out
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#706B61] font-semibold flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-[#3F7D58] shrink-0" />
                      {activeConv.contacts?.phone_number}
                    </p>
                  </div>
                </div>

                {/* Status Dropdown, Agent Assignment Dropdown & Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  
                  {/* Status Dropdown */}
                  <div className="flex items-center bg-[#E5DED2] border border-[#DFBE7E]/60 rounded-lg px-2.5 py-1">
                    <span className="text-[11px] font-bold text-[#706B61] mr-1.5 hidden sm:inline">Status:</span>
                    <select
                      value={(activeConv.status || 'OPEN').toUpperCase()}
                      onChange={(e) => updateConversationStatus(e.target.value as ConversationStatus)}
                      disabled={updatingStatus}
                      className="bg-transparent text-xs font-bold text-[#292722] outline-none cursor-pointer"
                    >
                      <option value="OPEN" className="bg-white text-[#3F7D58]">Open</option>
                      <option value="PENDING" className="bg-white text-amber-400">Pending</option>
                      <option value="RESOLVED" className="bg-white text-[#706B61]">Resolved</option>
                    </select>
                  </div>

                  {/* Agent Assignment Selector */}
                  <div className="flex items-center bg-[#E5DED2] border border-[#DFBE7E]/60 rounded-lg px-2.5 py-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#706B61] mr-1.5 hidden sm:inline" />
                    <select
                      value={activeConv.assigned_to || ''}
                      onChange={(e) => updateConversationAssignment(e.target.value || null)}
                      disabled={updatingAssignment}
                      className="bg-transparent text-xs font-bold text-[#292722] outline-none cursor-pointer max-w-[120px] truncate"
                    >
                      <option value="" className="bg-white text-[#706B61]">Unassigned</option>
                      {currentUser && (
                        <option value={currentUser.id} className="bg-white text-indigo-400">
                          Assign to Me
                        </option>
                      )}
                      {teamMembers.filter(m => m.id !== currentUser?.id).map((member) => (
                        <option key={member.id} value={member.id} className="bg-white text-[#292722]">
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Labels Toggle Button */}
                  <button
                    onClick={() => setShowLabelModal(true)}
                    className="p-1.5 rounded-lg border border-[#DFBE7E]/60 text-[#706B61] hover:text-[#292722] hover:bg-white shadow-sm transition-colors cursor-pointer"
                    title="Manage labels"
                  >
                    <Tag className="w-4 h-4" />
                  </button>

                  {/* Customer Profile Drawer Toggle */}
                  <button
                    onClick={() => setShowCustomerDrawer(!showCustomerDrawer)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      showCustomerDrawer ? 'bg-[#F1ECE3] text-[#B08D57] border-indigo-600' : 'text-[#706B61] hover:text-[#292722] border-[#DFBE7E]/60 hover:bg-white shadow-sm'
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
                  <span className="bg-[#FFFDFC]/90 px-3 py-1 rounded-full text-[10px] font-bold text-[#706B61] border border-[#E5DED2] shadow-sm">
                    Classic Pearl Unisex Salon • WhatsApp Business Encrypted
                  </span>
                </div>
                {(() => {
                  // Group messages by date for WhatsApp-style day separators
                  const getDateLabel = (dateStr: string) => {
                    const d = new Date(dateStr);
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);
                    if (d.toDateString() === today.toDateString()) return 'Today';
                    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
                    return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                  };

                  const grouped: { label: string; msgs: any[] }[] = [];
                  let currentLabel = '';
                  for (const msg of messages) {
                    const label = getDateLabel(msg.created_at);
                    if (label !== currentLabel) {
                      currentLabel = label;
                      grouped.push({ label, msgs: [] });
                    }
                    grouped[grouped.length - 1].msgs.push(msg);
                  }

                  return grouped.map(({ label, msgs }) => (
                    <div key={label}>
                      {/* Day separator */}
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-[#E5DED2]" />
                        <span className="text-[10px] font-bold text-[#9E968D] bg-[#F4EFE6] px-3 py-1 rounded-full border border-[#E5DED2] shadow-xs whitespace-nowrap">
                          {label}
                        </span>
                        <div className="flex-1 h-px bg-[#E5DED2]" />
                      </div>

                      {/* Messages for this day */}
                      {msgs.map((msg) => {
                        const isInbound = msg.direction === 'INBOUND';
                        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const isImage = msg.type === 'image';
                        const isVideo = msg.type === 'video';
                        const isDocument = msg.type === 'document';
                        const isTemplate = msg.type === 'template';
                        const isNote = msg.type === 'internal_note';

                        // content can be a JSON string (from Supabase Realtime) or an object (from REST API)
                        let c: any = msg.content;
                        if (typeof c === 'string') {
                          try { c = JSON.parse(c); } catch { /* plain text string */ }
                        }

                        const imageUrl = isImage
                          ? (c?.image?.link || c?.image?.url || c?.url)
                          : (isTemplate ? (c?.template?.header_image || c?.image?.url) : null);

                        // Try every known content shape to find the displayable text
                        const caption =
                          c?.text?.body                              // inbound: { text: { body: "hi" } }
                          || c?.text                                 // outbound simple: { text: "hi" }
                          || c?.[msg.type]?.body                     // { image: { body: "..." } }
                          || c?.[msg.type]?.caption                  // { image: { caption: "..." } }
                          || c?.caption                              // flat caption
                          || c?.body                                 // flat body
                          || (isTemplate ? (c?.template?.body_text || c?.template?.text) : null) // template
                          || c?.internal_note?.body                  // internal note
                          || (typeof msg.content === 'string' && !msg.content.startsWith('{') ? msg.content : null); // raw string

                        const templateButtons = c?.template?.buttons || [];

                        return (
                          <div
                            key={msg.id}
                            className={`flex group ${isNote ? 'justify-end' : isInbound ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[78%] sm:max-w-[65%] rounded-2xl p-3 shadow-md space-y-2 relative ${
                                isNote
                                  ? 'bg-amber-950/90 text-amber-200 border border-amber-600/50 rounded-tr-sm'
                                  : isInbound
                                  ? 'bg-white text-[#1E1B18] border border-[#E5DED2] rounded-tl-sm shadow-sm'
                                  : 'bg-[#25D366] text-white rounded-tr-sm shadow-md'
                              }`}
                            >
                              <button
                                onClick={() => deleteMessage(msg.id)}
                                className={`absolute top-2 ${isInbound ? '-right-7' : '-left-7'} opacity-0 group-hover:opacity-100 p-1 text-[#9E968D] hover:text-red-400 transition-all cursor-pointer z-10`}
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

                              {imageUrl && (
                                <div
                                  onClick={() => setPreviewImageUrl(imageUrl)}
                                  className="rounded-xl overflow-hidden max-h-80 border border-black/10 cursor-pointer hover:brightness-95 transition-all"
                                  title="Click to view full picture"
                                >
                                  <img src={imageUrl} alt="WhatsApp Image" className="w-full h-auto max-h-80 object-contain rounded-xl" />
                                </div>
                              )}

                              {isVideo && (
                                <div className="p-3 bg-black/10 rounded-xl flex items-center gap-2.5">
                                  <Video className="w-5 h-5 opacity-70" />
                                  <span className="text-xs font-bold">Video Message</span>
                                </div>
                              )}

                              {isDocument && (
                                <div className="p-2.5 bg-black/10 rounded-xl flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-rose-500" />
                                  <span className="text-xs font-bold truncate">Document Attachment</span>
                                </div>
                              )}

                              {isNote ? (
                                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                  {c?.internal_note?.body || c?.body || (typeof msg.content === 'string' ? msg.content : '')}
                                </p>
                              ) : caption ? (
                                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                  {caption}
                                </p>
                              ) : null}

                              {isTemplate && templateButtons.length > 0 && (
                                <div className="pt-2 border-t border-black/10 space-y-1.5">
                                  {templateButtons.map((btn: any, bIdx: number) => (
                                    <div key={bIdx}
                                      className="w-full py-1.5 px-3 rounded-lg bg-black/10 text-center text-xs font-bold border border-black/10 flex items-center justify-center gap-1.5">
                                      {btn.type === 'PHONE_NUMBER' ? <Phone className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                                      <span>{btn.text || btn.phone_number || 'Action'}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-end gap-1 text-[10px] opacity-60 font-bold pt-0.5">
                                <span>{time}</span>
                                {!isInbound && !isNote && (
                                  <span>
                                    {msg.status === 'READ' ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                                    ) : msg.status === 'DELIVERED' ? (
                                      <CheckCheck className="w-3.5 h-3.5" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Composer with WhatsApp Multiline Shift+Enter Support */}
              <div className="p-4 bg-[#FFFDFC] border-t border-[#E5DED2]">
                
                {/* Note Indicator Banner */}
                {isInternalNote && (
                  <div className="mb-2 px-3 py-1.5 bg-amber-950/90 border border-amber-600/50 rounded-lg flex items-center justify-between text-xs text-amber-200 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Writing an Internal Staff Note (Customer will NOT receive this)
                    </span>
                    <button onClick={() => setIsInternalNote(false)} className="text-amber-400 hover:text-[#292722] cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2 bg-[#E5DED2] border border-[#DFBE7E]/60/90 p-2 rounded-xl focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all shadow-md">
                  
                  {/* Media Attachment Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowMediaModal(true)}
                    className="p-2 text-[#706B61] hover:text-[#292722] hover:bg-white shadow-sm rounded-lg transition-colors cursor-pointer mb-0.5"
                    title="Attach Image, Video, or Document"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Quick Replies Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies(true)}
                    className="p-2 text-[#706B61] hover:text-indigo-400 hover:bg-white shadow-sm rounded-lg transition-colors cursor-pointer mb-0.5"
                    title="Quick Replies"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  {/* Internal Note Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(!isInternalNote)}
                    className={`p-2 rounded-lg transition-colors cursor-pointer mb-0.5 ${
                      isInternalNote ? 'bg-amber-950 text-amber-300 border border-amber-600' : 'text-[#706B61] hover:text-amber-400 hover:bg-white shadow-sm'
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
                    className="flex-1 bg-transparent border-none px-2 py-1.5 text-sm outline-none font-medium text-[#292722] placeholder:text-[#9E968D] resize-none max-h-32 min-h-[36px]"
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
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#F8F5EF]">
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#E5DED2] flex items-center justify-center text-[#706B61] mb-3 shadow-md">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-[#292722]">Select a Conversation</h3>
              <p className="text-xs text-[#706B61] font-medium max-w-sm mt-1">
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
          <div className="w-[300px] border-l border-[#E5DED2] bg-[#FFFDFC] p-6 overflow-y-auto space-y-6 shrink-0 hidden lg:block animate-in slide-in-from-right duration-150">
            <div className="text-center pb-5 border-b border-[#E5DED2]">
              <Avatar name={activeConv.contacts?.name} size="xl" className="mx-auto mb-3" />
              <h3 className="text-sm font-black text-[#292722]">{activeConv.contacts?.name || 'Customer'}</h3>
              <p className="text-xs text-[#706B61] font-semibold mt-0.5">{activeConv.contacts?.phone_number}</p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#706B61]">Marketing Consent</h4>
              <div className="p-3 rounded-xl bg-[#E5DED2] border border-[#E5DED2] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#292722] block">
                    {activeConv.contacts?.opted_in !== false ? 'Opted In' : 'Opted Out'}
                  </span>
                  <span className="text-[10px] text-[#706B61]">
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
              <h4 className="text-xs font-black uppercase tracking-wider text-[#706B61]">Details</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#E5DED2]/60">
                  <span className="text-[#706B61]">Created At</span>
                  <span className="font-bold text-[#292722]">
                    {new Date(activeConv.contacts?.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E5DED2]/60">
                  <span className="text-[#706B61]">Status</span>
                  <span className="font-extrabold text-[#3F7D58]">
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
              <div className="mt-2 bg-[#E5DED2] border border-[#E5DED2] rounded-xl overflow-hidden divide-y divide-slate-800 shadow-md">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#706B61] bg-[#F2ECE0]/50">
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
                      <p className="text-xs font-bold text-[#292722]">{c.name || 'Valued Customer'}</p>
                      <p className="text-[11px] text-[#706B61]">{c.phone_number}</p>
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

          <div className="pt-3 flex justify-end gap-2 border-t border-[#E5DED2]">
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
            <div className="text-sm text-[#706B61]">No labels created yet.</div>
          ) : (
            labels.map(lbl => {
              const isActive = activeLabels.includes(lbl.id);
              return (
                <button
                  key={lbl.id}
                  onClick={() => toggleLabel(lbl.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive ? 'border-indigo-500 bg-[#F1ECE3]/60' : 'border-[#E5DED2] hover:border-[#DFBE7E]/60 bg-[#E5DED2]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lbl.color || '#6366f1' }} />
                    <span className="text-sm font-bold text-[#292722]">{lbl.name}</span>
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
            <div className="text-sm text-[#706B61]">No quick replies found.</div>
          ) : (
            quickReplies.map(qr => (
              <div
                key={qr.id}
                onClick={() => {
                  setInputText(qr.content);
                  setShowQuickReplies(false);
                }}
                className="p-3 bg-[#E5DED2] border border-[#E5DED2] rounded-xl hover:border-indigo-500 hover:bg-[#F2ECE0] cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#292722]">{qr.title}</span>
                  <span className="text-[10px] font-mono text-indigo-400 bg-[#F1ECE3] px-1.5 py-0.5 rounded">
                    /{qr.shortcut}
                  </span>
                </div>
                <p className="text-xs text-[#5D564E] line-clamp-2">{qr.content}</p>
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
          <div className="flex bg-[#E5DED2] p-1 rounded-xl border border-[#E5DED2]">
            {(['image', 'video', 'document'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setMediaType(t);
                  setMediaUpload(null);
                }}
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                  mediaType === t ? 'bg-white shadow-sm text-[#292722] shadow-xs' : 'text-[#706B61] hover:text-[#2C2723]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <MediaUploader
            mediaType={mediaType}
            value={mediaUpload}
            onChange={setMediaUpload}
            required
            purpose="message"
            label={`Attach ${mediaType} file`}
          />

          <Input
            label="Message Caption (Optional)"
            placeholder="Add a caption..."
            value={mediaCaption}
            onChange={(e) => setMediaCaption(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-[#E5DED2]">
            <Button variant="outline" size="sm" onClick={() => setShowMediaModal(false)}>
              Cancel
            </Button>
            <Button
              variant="whatsapp"
              size="sm"
              isLoading={mediaSending}
              disabled={!mediaUpload}
              onClick={async () => {
                if (!activeConv || mediaSending || !mediaUpload) return;
                setMediaSending(true);
                try {
                  const res = await fetch('/api/whatsapp/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contactId: activeConv.contacts.id,
                      mediaType: mediaType,
                      mediaUrl: mediaUpload.url?.startsWith('http') ? mediaUpload.url : undefined,
                      mediaId: mediaUpload.media_id,
                      filename: mediaUpload.filename,
                      caption: mediaCaption.trim() || undefined
                    })
                  });
                  if (res.ok) {
                    setShowMediaModal(false);
                    setMediaUpload(null);
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

      {/* Full-Screen WhatsApp Image Lightbox Preview Modal */}
      {previewImageUrl && (
        <div 
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150 cursor-zoom-out"
        >
          <div className="absolute top-5 right-6 flex items-center gap-3 z-[110]">
            <a 
              href={previewImageUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white shadow-sm/90 hover:bg-slate-700 text-[#292722] text-xs font-bold rounded-lg transition-colors cursor-pointer border border-slate-600 shadow-md"
              title="Open full original image in new tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Original</span>
            </a>
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="p-2 bg-white shadow-sm/90 hover:bg-rose-900/80 text-[#292722] rounded-lg transition-colors cursor-pointer border border-slate-600 shadow-md"
              title="Close (or click anywhere)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="max-w-[94vw] max-h-[90vh] flex items-center justify-center p-2 cursor-default"
          >
            <img
              src={previewImageUrl}
              alt="Full Preview"
              className="max-w-full max-h-[86vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
