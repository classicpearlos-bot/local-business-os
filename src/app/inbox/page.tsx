'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { 
  Search, 
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
  X
} from "lucide-react";
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

  // Media Attachment State
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'document'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaSending, setMediaSending] = useState(false);

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
      const msgInterval = setInterval(() => fetchMessagesForConv(activeConvId), 2000);

      // Reset unread count on open
      supabase.from('conversations').update({ unread_count: 0 }).eq('id', activeConvId).then();
      return () => clearInterval(msgInterval);
    } else {
      setMessages([]);
    }
  }, [activeConvId, fetchMessagesForConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = conversations.filter(c => {
    if (filter === 'unassigned' && c.assigned_to) return false;
    if (filter === 'mine' && currentUser && c.assigned_to !== currentUser.id) return false;
    if (search) {
      const name = c.contacts?.name?.toLowerCase() || '';
      const phone = c.contacts?.phone_number?.toLowerCase() || '';
      const q = search.toLowerCase();
      return name.includes(q) || phone.includes(q);
    }
    return true;
  });

  const activeConv = conversations.find(c => c.id === activeConvId);

  const sendMessage = async () => {
    if (!inputText.trim() || !activeConvId || !activeConv || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: activeConv.contacts.id,
          text: textToSend
        })
      });

      if (!res.ok) {
        console.error("Failed to send message:", await res.text());
      }
    } catch (err) {
      console.error("Network error sending message", err);
    } finally {
      setSending(false);
    }
  };

  const sendMediaMessage = async () => {
    if (!mediaUrl.trim() || !activeConv || mediaSending) return;

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

  const toggleOptIn = async () => {
    if (!activeConv?.contacts?.id) return;
    const newStatus = !activeConv.contacts.opted_in;
    await supabase.from('contacts').update({ opted_in: newStatus }).eq('id', activeConv.contacts.id);
    fetchConversations();
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar className="hidden md:flex" />

      <main className="flex-1 flex overflow-hidden min-w-0">
        
        {/* Pane 1: Conversations List */}
        <div className={`w-full md:w-[340px] lg:w-[380px] border-r border-slate-200/80 flex flex-col bg-white shrink-0 ${
          activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header & Filter Tabs */}
          <div className="p-5 border-b border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Shared Inbox</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Multi-agent live WhatsApp chats</p>
              </div>
              <button 
                onClick={fetchConversations} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Refresh conversations"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex bg-slate-100/80 p-1 rounded-xl">
              <button 
                onClick={() => setFilter('all')} 
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === 'all' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('mine')} 
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === 'mine' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Mine
              </button>
              <button 
                onClick={() => setFilter('unassigned')} 
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === 'unassigned' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Unassigned
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              />
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
                    isActive ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r" />
                  )}

                  <div className="flex items-start gap-3">
                    <Avatar name={contactName} size="md" status={conv.unread_count > 0 ? 'online' : undefined} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-bold truncate ${isActive ? 'text-indigo-900' : 'text-slate-900'}`}>
                          {contactName}
                        </p>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span className="truncate flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          {phone}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {conv.assigned_to && (
                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold" title="Assigned">
                              A
                            </span>
                          )}
                          {conv.unread_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold shadow-xs">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredConversations.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold text-slate-600">No conversations</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Incoming chats will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pane 2: Active Chat Canvas */}
        <div className={`flex-1 flex flex-col bg-white min-w-0 ${
          !activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConv ? (
            <>
              {/* Active Conversation Top Bar */}
              <header className="px-6 py-4 border-b border-slate-200/80 bg-white flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <Avatar name={activeConv.contacts?.name} size="md" />

                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-slate-900 truncate">
                      {activeConv.contacts?.name || 'Unknown Contact'}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                      {activeConv.contacts?.phone_number}
                    </p>
                  </div>
                </div>

                {/* Assignment & Profile Info Trigger */}
                <div className="flex items-center gap-3 shrink-0">
                  {activeConv.assigned_to ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="success" dot>Assigned</Badge>
                      <Button variant="ghost" size="sm" onClick={unassign}>Unassign</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={assignToMe}>
                      Assign to Me
                    </Button>
                  )}

                  <button
                    onClick={() => setShowCustomerDrawer(!showCustomerDrawer)}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      showCustomerDrawer ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-slate-400 hover:text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Customer profile"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {/* Chat Canvas with Wallpaper */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 wa-chat-bg">
                <div className="text-center my-2">
                  <span className="bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 shadow-xs border border-slate-200/60 uppercase tracking-wider">
                    WhatsApp End-to-End Direct API
                  </span>
                </div>

                {messages.map((msg) => {
                  const isInbound = msg.direction === 'INBOUND';
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  // Handle media vs text
                  const isImage = msg.type === 'image';
                  const isVideo = msg.type === 'video';
                  const isDocument = msg.type === 'document';
                  const imageUrl = isImage ? (msg.content?.image?.link || msg.content?.image?.url) : null;
                  const caption = msg.content?.[msg.type]?.caption || msg.content?.text?.body;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl p-3 shadow-sm space-y-2 relative ${
                          isInbound
                            ? 'bg-white text-slate-900 rounded-tl-xs border border-slate-200/60'
                            : 'bg-[#DCF8C6] text-slate-900 rounded-tr-xs border border-[#C2EDB0]'
                        }`}
                      >
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
                          <div className="p-3 bg-slate-100 rounded-xl flex items-center gap-2.5">
                            <FileText className="w-5 h-5 text-rose-500" />
                            <span className="text-xs font-bold truncate">Document File</span>
                          </div>
                        )}

                        {/* Text / Caption */}
                        {(caption || (!isImage && !isVideo && !isDocument && msg.type === 'text')) && (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {caption || msg.content?.text?.body}
                          </p>
                        )}

                        {msg.type === 'template' && (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            [Template: {msg.content?.template?.name || 'WhatsApp Template'}]
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-medium">
                          <span>{time}</span>
                          {!isInbound && (
                            <span>
                              {msg.status === 'READ' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                              ) : msg.status === 'DELIVERED' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-400" />
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
              <div className="p-4 bg-white border-t border-slate-200/80">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 p-2 rounded-2xl focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-xs">
                  <button
                    type="button"
                    onClick={() => setShowMediaModal(true)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
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
                    className="flex-1 bg-transparent border-none px-2 py-1.5 text-sm outline-none font-medium text-slate-800 placeholder:text-slate-400"
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
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Select a Conversation</h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm mt-1">
                Choose a customer from the left sidebar to view message history, manage assignments, and reply in real-time.
              </p>
            </div>
          )}
        </div>

        {/* Pane 3: Slide-in Customer Profile Drawer */}
        {showCustomerDrawer && activeConv && (
          <div className="w-[300px] lg:w-[320px] border-l border-slate-200/80 bg-white p-6 overflow-y-auto space-y-6 shrink-0 hidden lg:block animate-in slide-in-from-right duration-200">
            <div className="text-center pb-6 border-b border-slate-100">
              <Avatar name={activeConv.contacts?.name} size="xl" className="mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">{activeConv.contacts?.name || 'Unknown Contact'}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{activeConv.contacts?.phone_number}</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Marketing Opt-In</h4>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  {activeConv.contacts?.opted_in ? 'Opted In' : 'Opted Out'}
                </span>
                <button
                  onClick={toggleOptIn}
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
                    activeConv.contacts?.opted_in ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact Details</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Created At</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(activeConv.contacts?.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Status</span>
                  <Badge variant="success">{activeConv.status || 'OPEN'}</Badge>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Attach Media Modal */}
      <Modal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        title="Send WhatsApp Media Message"
        description="Attach an image, video, or document to send directly to this customer."
      >
        <div className="space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['image', 'video', 'document'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMediaType(t)}
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                  mediaType === t ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
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

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
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
