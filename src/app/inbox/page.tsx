'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { Search, 
  Send, 
  MoreVertical, 
  Phone, 
  MessageSquare, 
  User, 
  Check, 
  CheckCheck, 
  UserCircle2, 
  Sparkles, 
  RefreshCw, 
  ArrowLeft,
  Tag,
  ShieldCheck,
  Clock,
  ChevronRight,
  Info,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Video,
  Download,
  X,
  Plus,
  Bell, Trash2, UserCheck, AlertCircle } from "lucide-react";
import { normalizePhoneNumber, isValidWhatsAppNumber } from '@/utils/phone';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export default function Inbox() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'mine'>('all');
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  type ConversationStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  type StatusFilterType = 'ALL' | 'OPEN' | 'PENDING' | 'RESOLVED';
  type AssignmentFilterType = 'all' | 'mine' | 'unassigned';

  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilterType>('all');
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [contactSearchResults, setContactSearchResults] = useState<any[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignment, setUpdatingAssignment] = useState(false);

  // New Conversation Modal State
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [newConvPhone, setNewConvPhone] = useState('');
  const [newConvName, setNewConvName] = useState('');
  const [newConvError, setNewConvError] = useState('');
  const [newConvLoading, setNewConvLoading] = useState(false);

  // Media Attachment State
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false); // Deprecated big modal, kept for fallback if needed
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'document' | 'location'>('image');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaSending, setMediaSending] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);
  
  // Location States
  const [locLat, setLocLat] = useState('12.9716');
  const [locLng, setLocLng] = useState('77.5946');
  const [locName, setLocName] = useState('Classic Pearl Unisex Salon');
  const [locAddress, setLocAddress] = useState('Bengaluru, Karnataka');

  // Phase 1 States
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [labels, setLabels] = useState<any[]>([]);
  const [activeLabels, setActiveLabels] = useState<any[]>([]);
  const [showLabelModal, setShowLabelModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const json = await res.json();
        if (json.conversations) {
          setConversations(json.conversations);
          return;
        }
      }
    } catch (e) {
      console.error('API fetch error, falling back to Supabase:', e);
    }

    const { data } = await supabase
      .from('conversations')
      .select(`
        id,
        status,
        assigned_to,
        unread_count,
        last_message_at,
        contacts (id, name, phone_number, opted_in, created_at)
      `)
      .order('last_message_at', { ascending: false });

    if (data) setConversations(data);
  }, []);

  

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

  const fetchContactsList = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('contacts')
        .select('id, name, phone_number, opted_in')
        .limit(200);
      if (data) setAllContacts(data);
    } catch (e) {}
  }, []);

  const updateConversationStatus = async (newStatus: ConversationStatus) => {
    if (!activeConvId || updatingStatus) return;
    setUpdatingStatus(true);
    setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, status: newStatus } : c));

    try {
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) fetchConversations();
    } catch (e) {
      fetchConversations();
    fetchTeamMembers();
    fetchContactsList();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateConversationAssignment = async (assignedToId: string | null) => {
    if (!activeConvId || updatingAssignment) return;
    setUpdatingAssignment(true);
    setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, assigned_to: assignedToId } : c));

    try {
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: assignedToId })
      });
      if (!res.ok) fetchConversations();
    } catch (e) {
      fetchConversations();
    } finally {
      setUpdatingAssignment(false);
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!window.confirm('Delete this message for yourself? (Note: WhatsApp API does not allow deleting messages for the customer once sent)')) return;
    try {
      const res = await fetch(`/api/messages/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(messages.filter(m => m.id !== msgId));
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
    const interval = setInterval(fetchConversations, 3000);

    // Realtime conversation updates
    const convChannel = supabase
      .channel('inbox-conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    // Realtime message updates
    const msgChannel = supabase
      .channel('inbox-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(convChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [fetchConversations]);

  useEffect(() => {
    if (activeConvId) {
      fetchMessagesForConv(activeConvId);
      fetchActiveConvLabels(activeConvId);
      const msgInterval = setInterval(() => fetchMessagesForConv(activeConvId), 2000);

      // Instantly clear unread count locally for UI responsiveness
      setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, unread_count: 0 } : c));
      
      // Mark as read in DB & Meta
      fetch(`/api/conversations/${activeConvId}/read`, { method: 'POST' }).catch(()=>{});
      
      return () => clearInterval(msgInterval);
    } else {
      setMessages([]);
    }
  }, [activeConvId, fetchMessagesForConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConvId]); // Only auto-scroll on new messages or conversation change


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
      const { data, error } = await supabase
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


  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      if (statusFilter !== 'ALL') {
        const convStatus = (c.status || 'OPEN').toUpperCase();
        if (convStatus !== statusFilter) return false;
      }
      if (assignmentFilter === 'unassigned' && c.assigned_to) return false;
      if (assignmentFilter === 'mine' && currentUser && c.assigned_to !== currentUser.id) return false;

      if (selectedLabelId) {
        const convLabels = c.conversation_labels || [];
        const hasLabel = convLabels.some((l: any) => l.label_id === selectedLabelId || l.chat_labels?.id === selectedLabelId);
        if (!hasLabel) return false;
      }

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
        if (!res.ok) console.error("Failed to send message:", await res.text());
      }
    } catch (err) {
      console.error("Error sending", err);
    } finally {
      setSending(false);
    }
  };

  const handleInstantFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
    if (!e.target.files || !e.target.files[0] || !activeConv || sending) return;
    const file = e.target.files[0];
    setShowAttachmentMenu(false);
    setSending(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data, error } = await supabase.storage.from('whatsapp_media').upload(fileName, file);
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage.from('whatsapp_media').getPublicUrl(fileName);
      
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: activeConv.contacts.id,
          mediaType: type,
          mediaUrl: publicUrlData.publicUrl,
          filename: type === 'document' ? file.name : undefined
        })
      });
    } catch(err) {
      console.error(err);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sendMediaMessage = async () => {
    if (!activeConv || mediaSending) return;
    if (mediaType !== 'location' && !mediaUrl.trim() && !localFile) return;

    setMediaSending(true);
    try {
      let finalUrl = mediaUrl.trim();

      // If they selected a local file, upload it first to our bucket
      if (localFile && mediaType !== 'location') {
         const fileExt = localFile.name.split('.').pop();
         const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
         
         const { data, error } = await supabase.storage.from('whatsapp_media').upload(fileName, localFile);
         if (error) {
           console.error("Upload error", error);
           setMediaSending(false);
           return;
         }
         
         const { data: publicUrlData } = supabase.storage.from('whatsapp_media').getPublicUrl(fileName);
         finalUrl = publicUrlData.publicUrl;
      }

      const payload: any = {
        contactId: activeConv.contacts.id,
      };

      if (mediaType === 'location') {
        payload.location = {
          latitude: parseFloat(locLat),
          longitude: parseFloat(locLng),
          name: locName,
          address: locAddress
        };
      } else {
        payload.mediaType = mediaType;
        payload.mediaUrl = finalUrl;
        payload.caption = mediaCaption.trim() || undefined;
      }

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowMediaModal(false);
        setMediaUrl('');
        setMediaCaption('');
        setLocalFile(null);
      }
    } finally {
      setMediaSending(false);
    }
  };

  const assignToMe = async () => {
    if (!activeConvId || !currentUser) return;
    await supabase.from('conversations').update({ assigned_to: currentUser.id }).eq('id', activeConvId);
    fetchConversations();
  };

  const unassign = async () => {
    if (!activeConvId) return;
    await supabase.from('conversations').update({ assigned_to: null }).eq('id', activeConvId);
    fetchConversations();
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

  const startNewConversation = async (phoneToUse?: string, nameToUse?: string) => {
    const rawPhone = phoneToUse || newConvPhone;
    const contactName = nameToUse || newConvName;

    if (!rawPhone.trim()) {
      setNewConvError('Phone number is required.');
      return;
    }

    const normalized = normalizePhoneNumber(rawPhone.trim());
    if (!isValidWhatsAppNumber(normalized)) {
      setNewConvError('Please enter a valid WhatsApp phone number with country code (e.g. +917483654138).');
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
    <div className="flex h-screen bg-[#090D16]">
      <Sidebar className="hidden md:flex" />

      <main className="flex-1 flex overflow-hidden min-w-0">
        
        {/* Pane 1: Conversations List */}
        <div className={`w-full md:w-[340px] lg:w-[380px] border-r border-slate-800 flex flex-col bg-[#0F172A] shrink-0 ${
          activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header & Filter Tabs */}
          <div className="p-5 border-b border-slate-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">Shared Inbox</h1>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{conversations.length} conversations</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={fetchConversations} 
                  className="p-2 text-gray-500 hover:text-gray-300 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                  title="Refresh conversations"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setShowNewConvModal(true); setNewConvError(''); setNewConvPhone(''); setNewConvName(''); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600  border-none hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  title="Start a new conversation"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Chat
                </button>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex bg-[#090D16] p-1 rounded-xl border border-slate-800/60">
              {(['ALL', 'OPEN', 'PENDING', 'RESOLVED'] as const).map((st) => (
                <button 
                  key={st}
                  onClick={() => setStatusFilter(st)} 
                  className={`flex-1 text-[11px] font-extrabold py-1.5 rounded-lg transition-all cursor-pointer capitalize ${
                    statusFilter === st 
                      ? 'bg-indigo-600 text-white shadow-xs ' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {st.toLowerCase()}
                </button>
              ))}
            </div>

            {/* Secondary Staff Filter */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex gap-2">
                <button 
                  onClick={() => setAssignmentFilter('all')}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    assignmentFilter === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  All Staff
                </button>
                <button 
                  onClick={() => setAssignmentFilter('mine')}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    assignmentFilter === 'mine' ? 'bg-white/10 text-[var(--color-cyber-pink)]' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Assigned to Me
                </button>
                <button 
                  onClick={() => setAssignmentFilter('unassigned')}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    assignmentFilter === 'unassigned' ? 'bg-white/10 text-amber-400' : 'text-gray-400 hover:text-gray-300'
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
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                    selectedLabelId === null
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-slate-800/60'
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
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap transition-all cursor-pointer border ${
                        isSelected
                          ? 'border-white text-white shadow-xs'
                          : 'border-transparent text-gray-300 hover:text-white'
                      }`}
                      style={{ 
                        backgroundColor: isSelected ? lbl.color : `${lbl.color}22`,
                        borderColor: isSelected ? '#ffffff' : `${lbl.color}55`
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? '#ffffff' : lbl.color }} />
                      {lbl.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#090D16] border border-slate-800 rounded-xl text-xs font-medium focus:bg-[#0F172A] focus:ring-2 focus:ring-[var(--color-cyber-purple)]/20 focus:border-[var(--color-cyber-purple)] transition-all outline-none"
                />
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    Notification.requestPermission().then(permission => {
                      if (permission === 'granted') {
                        new Notification('Notifications Enabled!', { body: 'You will now receive alerts for new messages.', icon: '/favicon.ico' });
                      } else {
                        alert("Browser notifications were blocked. Please enable them in your browser settings.");
                      }
                    });
                  }
                }}
                className="p-2 bg-[#090D16] border border-slate-800 rounded-xl text-gray-500 hover:text-indigo-400 hover:bg-indigo-600/10 transition-all shrink-0"
                title="Enable Desktop Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation List Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.map((conv) => {
              const isActive = activeConvId === conv.id;
              const contactName = conv.contacts?.name || 'Customer';
              const phone = conv.contacts?.phone_number || '-';

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-4 cursor-pointer transition-all duration-150 relative group ${
                    isActive ? 'bg-indigo-600/10/60' : 'hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600  border-none rounded-r" />
                  )}

                  <div className="flex items-start gap-3">
                    <Avatar name={contactName} size="md" status={conv.unread_count > 0 ? 'online' : undefined} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-bold truncate ${isActive ? 'text-indigo-900' : 'text-white'}`}>
                          {contactName}
                        </p>
                        <span className="text-[10px] font-semibold text-gray-500 shrink-0">
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 font-medium mb-1">
                        <span className="truncate flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                          {phone}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {status === 'RESOLVED' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-800 text-slate-400 border border-slate-700">
                              RESOLVED
                            </span>
                          ) : status === 'PENDING' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-950/60 text-amber-400 border border-amber-800/50">
                              PENDING
                            </span>
                          ) : null}

                          {conv.unread_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-indigo-600  border-none text-white text-[10px] font-extrabold shadow-xs">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Attached Labels */}
                      {conv.conversation_labels && conv.conversation_labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {conv.conversation_labels.slice(0, 3).map((cl: any) => {
                            const lbl = cl.chat_labels || labels.find(l => l.id === cl.label_id);
                            if (!lbl) return null;
                            return (
                              <span
                                key={lbl.id}
                                className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white/90"
                                style={{ backgroundColor: `${lbl.color}44`, border: `1px solid ${lbl.color}88` }}
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
              <div className="p-12 text-center text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold text-gray-300">No conversations</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Incoming chats will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pane 2: Active Chat Canvas */}
        <div className={`flex-1 flex flex-col bg-[#0F172A] min-w-0 ${
          !activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConv ? (
            <>
              {/* Active Conversation Top Bar */}
              <header className="px-6 py-4 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-1.5 text-gray-400 hover:text-white rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <Avatar name={activeConv.contacts?.name} size="md" />

                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-white truncate">
                      {activeConv.contacts?.name || 'Unknown Contact'}
                    </h2>
                    <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                      {activeConv.contacts?.phone_number}
                    </p>
                  </div>
                </div>

                {/* Status Dropdown, Agent Assignment Dropdown & Controls */}
                <div className="flex items-center gap-2.5 shrink-0">
                  
                  {/* Status Dropdown */}
                  <div className="flex items-center bg-[#090D16] border border-slate-800 rounded-xl px-2 py-1">
                    <span className="text-[11px] font-bold text-gray-400 mr-1.5 hidden sm:inline">Status:</span>
                    <select
                      value={(activeConv.status || 'OPEN').toUpperCase()}
                      onChange={(e) => updateConversationStatus(e.target.value as ConversationStatus)}
                      disabled={updatingStatus}
                      className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                    >
                      <option value="OPEN" className="bg-[#1E1B2E] text-emerald-400">Open</option>
                      <option value="PENDING" className="bg-[#1E1B2E] text-amber-400">Pending</option>
                      <option value="RESOLVED" className="bg-[#1E1B2E] text-gray-400">Resolved</option>
                    </select>
                  </div>

                  {/* Agent Assignment Selector */}
                  <div className="flex items-center bg-[#090D16] border border-slate-800 rounded-xl px-2 py-1">
                    <UserCheck className="w-3.5 h-3.5 text-gray-400 mr-1.5 hidden sm:inline" />
                    <select
                      value={activeConv.assigned_to || ''}
                      onChange={(e) => updateConversationAssignment(e.target.value || null)}
                      disabled={updatingAssignment}
                      className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer max-w-[120px] truncate"
                    >
                      <option value="" className="bg-[#1E1B2E] text-gray-400">Unassigned</option>
                      {currentUser && (
                        <option value={currentUser.id} className="bg-[#1E1B2E] text-indigo-400">
                          Assign to Me
                        </option>
                      )}
                      {teamMembers.filter(m => m.id !== currentUser?.id).map((member) => (
                        <option key={member.id} value={member.id} className="bg-[#1E1B2E] text-white">
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Labels Toggle Button */}
                  <button
                    onClick={() => setShowLabelModal(true)}
                    className="p-2 rounded-xl border border-slate-800 text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title="Manage labels"
                  >
                    <Tag className="w-4 h-4" />
                  </button>

                  {/* Customer Profile Drawer Toggle */}
                  <button
                    onClick={() => setShowCustomerDrawer(!showCustomerDrawer)}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      showCustomerDrawer ? 'bg-indigo-600/20 text-indigo-400 border-[var(--color-cyber-purple)]/50' : 'text-gray-400 hover:text-white border-slate-800 hover:bg-white/5'
                    }`}
                    title="Customer profile details"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {/* Chat Canvas with Wallpaper */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 wa-chat-bg">
                <div className="text-center my-2">
                  <span className="bg-[#0F172A]/90 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] font-bold text-gray-400 shadow-xs border border-slate-800 uppercase tracking-wider">
                    Classic Pearl Salon • End-to-End Encrypted
                  </span>
                </div>

                {messages.map((msg) => {
                  const isInbound = msg.direction === 'INBOUND';
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  // Handle media vs text
                  const isImage = msg.type === 'image';
                  const isVideo = msg.type === 'video';
                  const isDocument = msg.type === 'document';
                  const isNote = msg.type === 'internal_note';
                  const imageUrl = isImage ? (msg.content?.image?.link || msg.content?.image?.url) : null;
                  const caption = msg.content?.[msg.type]?.caption || msg.content?.text?.body;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isNote ? 'justify-end' : (isInbound ? 'justify-start' : 'justify-end')}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl p-3 shadow-sm space-y-2 relative ${
                          isInbound
                            ? 'bg-[#0F172A] text-white rounded-tl-xs border border-slate-800'
                            : 'bg-indigo-600 text-white rounded-tr-xs  border-none'
                        }`}
                      >
                        
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className={`absolute top-2 ${isInbound ? '-right-8' : '-left-8'} opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all cursor-pointer z-10`}
                            title="Delete for me"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Render Media Payload */}
                        {isImage && imageUrl && (
                          <div className="rounded-xl overflow-hidden max-h-60 bg-black/5">
                            <img src={imageUrl} alt="Attached image" className="w-full h-full object-cover" />
                          </div>
                        )}

                        {isVideo && (
                          <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center gap-3">
                            <Video className="w-6 h-6 text-white/80" />
                            <span className="text-xs font-semibold">Video Message</span>
                          </div>
                        )}

                        {isDocument && (
                          <div className="p-3 bg-white/10 rounded-xl flex items-center gap-2.5">
                            <FileText className="w-5 h-5 text-rose-500" />
                            <span className="text-xs font-bold truncate">Document File</span>
                          </div>
                        )}

                        {/* Text / Caption */}
                        {(isNote) && (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {msg.content}
                          </p>
                        )}
                        {(caption || (!isImage && !isVideo && !isDocument && !isNote && msg.type === 'text')) && (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {caption || msg.content?.text?.body}
                          </p>
                        )}

                        {msg.type === 'template' && (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            [Template: {msg.content?.template?.name || 'WhatsApp Template'}]
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 font-medium">
                          <span>{time}</span>
                          {!isInbound && (
                            <span>
                              {msg.status === 'READ' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                              ) : msg.status === 'DELIVERED' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-gray-500" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-gray-500" />
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

              {/* Chat Composer */}
              <div className="p-4 bg-[#0F172A] border-t border-slate-800">
                <div className="flex items-center gap-2 bg-[#090D16] border border-slate-800 p-2 rounded-2xl focus-within:bg-[#0F172A] focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-xs">
                  <button
                    type="button"
                    onClick={() => setShowMediaModal(true)}
                    className="p-2 text-gray-500 hover:text-indigo-400 hover:bg-indigo-600/10 rounded-xl transition-colors cursor-pointer"
                    title="Attach Image, Video, or Document"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message to reply..."
                    className="flex-1 bg-transparent border-none px-2 py-1.5 text-sm outline-none font-medium text-gray-100 placeholder:text-gray-500"
                  />

                  <Button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending}
                    size="sm"
                    variant="primary"
                    className="rounded-xl px-4 py-2"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#090D16]/50">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-[var(--color-cyber-purple)]/20 flex items-center justify-center text-indigo-400 mb-4 shadow-xs">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Select a Conversation</h3>
              <p className="text-xs text-gray-400 font-medium max-w-sm mt-1">
                Choose a customer from the left sidebar to view message history, manage assignments, and reply in real-time.
              </p>
            </div>
          )}
        </div>

        {/* Pane 3: Slide-in Customer Profile Drawer */}
        {showCustomerDrawer && activeConv && (
          <div className="w-[300px] lg:w-[320px] border-l border-slate-800 bg-[#0F172A] p-6 overflow-y-auto space-y-6 shrink-0 hidden lg:block animate-in slide-in-from-right duration-200">
            <div className="text-center pb-6 border-b border-slate-800/60">
              <Avatar name={activeConv.contacts?.name} size="xl" className="mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">{activeConv.contacts?.name || 'Unknown Contact'}</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">{activeConv.contacts?.phone_number}</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Marketing Opt-In</h4>
              <div className="p-3 rounded-xl bg-[#090D16] border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">
                  {activeConv.contacts?.opted_in ? 'Opted In' : 'Opted Out'}
                </span>
                <button
                  onClick={toggleOptIn}
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
                    activeConv.contacts?.opted_in ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-[#0F172A] shadow-xs" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Contact Details</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-gray-500">Created At</span>
                  <span className="font-semibold text-gray-200">
                    {new Date(activeConv.contacts?.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-gray-500">Status</span>
                  <Badge variant="success">{activeConv.status || 'OPEN'}</Badge>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>


      {/* Label Management Modal */}
      <Modal
        isOpen={showLabelModal}
        onClose={() => setShowLabelModal(false)}
        title="Manage Conversation Labels"
        description="Select labels to apply to this conversation."
      >
        <div className="space-y-3">
          {labels.length === 0 ? (
            <div className="text-sm text-gray-400">No labels exist. Admins can create labels in settings.</div>
          ) : (
            labels.map(lbl => {
              const isActive = activeLabels.includes(lbl.id);
              return (
                <button
                  key={lbl.id}
                  onClick={() => toggleLabel(lbl.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isActive ? 'border-indigo-500 bg-indigo-600/10/50' : 'border-slate-800 hover:border-indigo-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lbl.color }} />
                    <span className="text-sm font-bold text-gray-100">{lbl.name}</span>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
              );
            })
          )}
        </div>
      </Modal>

      {/* + START NEW CHAT MODAL with Contact Search & Duplicate Prevention */}
      <Modal
        isOpen={showNewConvModal}
        onClose={() => setShowNewConvModal(false)}
        title="Start New WhatsApp Conversation"
        description="Search an existing customer or type a new WhatsApp number with country code."
      >
        <div className="space-y-4">
          <div>
            <Input
              label="Customer Phone Number *"
              placeholder="+917483654138"
              value={newConvPhone}
              onChange={(e) => handleNewConvPhoneChange(e.target.value)}
              helperText="E.164 format: include country code (e.g. +91XXXXXXXXXX)."
            />

            {/* Autocomplete Suggestions */}
            {contactSearchResults.length > 0 && (
              <div className="mt-2 bg-[#090D16] border border-white/15 rounded-xl overflow-hidden divide-y divide-white/5 shadow-md">
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 bg-white/5">
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
                    className="p-2.5 hover:bg-indigo-600/20 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{c.name || 'Valued Customer'}</p>
                      <p className="text-[11px] text-gray-400">{c.phone_number}</p>
                    </div>
                    <Badge variant="success">Existing</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Input
            label="Customer Name (Optional for new contacts)"
            placeholder="e.g. Ravi Kumar"
            value={newConvName}
            onChange={(e) => setNewConvName(e.target.value)}
            helperText="Name to save for this contact in the CRM."
          />

          {newConvError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
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

      
      {/* Location Modal */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="Send Location"
        description="Share a location with this customer."
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input label="Latitude" value={locLat} onChange={e => setLocLat(e.target.value)} required />
            <Input label="Longitude" value={locLng} onChange={e => setLocLng(e.target.value)} required />
          </div>
          <Input label="Location Name" value={locName} onChange={e => setLocName(e.target.value)} />
          <Input label="Address" value={locAddress} onChange={e => setLocAddress(e.target.value)} />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800/60">
            <Button variant="outline" size="sm" onClick={() => setShowLocationModal(false)}>
              Cancel
            </Button>
            <Button
              variant="whatsapp"
              size="sm"
              isLoading={sending}
              onClick={async () => {
                setSending(true);
                try {
                  const res = await fetch('/api/whatsapp/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contactId: activeConvId ? conversations.find(c => c.id === activeConvId)?.contact_id : '',
                      location: {
                        latitude: parseFloat(locLat),
                        longitude: parseFloat(locLng),
                        name: locName,
                        address: locAddress
                      }
                    })
                  });
                  if (res.ok) setShowLocationModal(false);
                } finally {
                  setSending(false);
                }
              }}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send Location
            </Button>
          </div>
        </div>
      </Modal>

      {/* Attach Media Modal */}
      <Modal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        title="Send WhatsApp Media Message"
        description="Attach an image, video, or document to send directly to this customer."
      >
        <div className="space-y-4">
          <div className="flex bg-white/10 p-1 rounded-xl">
            {(['image', 'video', 'document'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMediaType(t)}
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                  mediaType === t ? 'bg-[#0F172A] text-indigo-400 shadow-xs' : 'text-gray-400 hover:text-gray-200'
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

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800/60">
            <Button variant="outline" size="sm" onClick={() => setShowMediaModal(false)}>
              Cancel
            </Button>
            <Button
              variant="whatsapp"
              size="sm"
              isLoading={mediaSending}
              disabled={!mediaUrl.trim()}
              onClick={sendMediaMessage}
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
