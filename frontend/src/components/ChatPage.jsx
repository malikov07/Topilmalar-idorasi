import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, MessageCircle, Package } from 'lucide-react';
import api from '../service/api';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useLanguage } from '../context/LanguageContext';

export default function ChatPage() {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useLanguage();
    const { sendMessage, notifyRead, subscribeToMessages } = useChat();

    const myId = String(user?.id || user?.user_id || '');

    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loadingList, setLoadingList] = useState(true);
    const [loadingThread, setLoadingThread] = useState(false);

    const activeIdRef = useRef(conversationId);
    activeIdRef.current = conversationId;
    const bottomRef = useRef(null);

    const fetchConversations = useCallback(async () => {
        try {
            const res = await api.get('/api/chat/conversations/');
            setConversations(res.data.results || res.data || []);
        } catch (err) {
            console.error('Failed to load conversations:', err);
        } finally {
            setLoadingList(false);
        }
    }, []);

    useEffect(() => { if (user) fetchConversations(); }, [user, fetchConversations]);

    // Load messages for the open conversation + mark it read.
    useEffect(() => {
        if (!conversationId) { setMessages([]); return; }
        let active = true;
        setLoadingThread(true);
        (async () => {
            try {
                const res = await api.get(`/api/chat/conversations/${conversationId}/messages/`);
                if (!active) return;
                setMessages(res.data.results || res.data || []);
                notifyRead(conversationId);
            } catch (err) {
                console.error('Failed to load messages:', err);
            } finally {
                if (active) setLoadingThread(false);
            }
        })();
        return () => { active = false; };
    }, [conversationId, notifyRead]);

    // Live incoming messages.
    useEffect(() => {
        const unsubscribe = subscribeToMessages((message) => {
            if (String(message.conversation) === String(activeIdRef.current)) {
                setMessages((prev) => (
                    prev.some((m) => m.id === message.id) ? prev : [...prev, message]
                ));
                if (String(message.sender) !== myId) notifyRead(activeIdRef.current);
            }
            // Refresh the inbox (ordering, previews, unread badges).
            fetchConversations();
        });
        return unsubscribe;
    }, [subscribeToMessages, notifyRead, fetchConversations, myId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || !conversationId) return;
        if (sendMessage(conversationId, text)) setInput('');
    };

    const activeConversation = conversations.find((c) => String(c.id) === String(conversationId));

    const formatTime = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-slate-50">
            <div className="max-w-6xl mx-auto px-0 sm:px-4 lg:px-6">
                <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] bg-white sm:rounded-2xl sm:my-4 shadow-sm border border-slate-100 overflow-hidden h-[calc(100vh-6.5rem)]">

                    {/* ── Inbox ───────────────────────────────────── */}
                    <div className={`${conversationId ? 'hidden md:flex' : 'flex'} flex-col border-r border-slate-100 min-h-0`}>
                        <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-2 shrink-0">
                            <MessageCircle className="text-[#1E85FF]" size={20} />
                            <h1 className="text-lg font-extrabold text-slate-900">{t('chat.title')}</h1>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {loadingList ? (
                                <div className="p-6 text-center text-slate-400 text-sm">{t('chat.loading')}</div>
                            ) : conversations.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">{t('chat.empty')}</div>
                            ) : (
                                conversations.map((c) => {
                                    const isActive = String(c.id) === String(conversationId);
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => navigate(`/chat/${c.id}`)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-50 transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                        >
                                            <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-100">
                                                <img
                                                    src={c.other_user?.avatar || 'https://via.placeholder.com/120x120?text=User'}
                                                    alt={c.other_user?.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-bold text-slate-800 text-sm truncate">{c.other_user?.name}</span>
                                                    <span className="text-[10px] text-slate-400 shrink-0">{formatTime(c.last_message?.created_at)}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                                                    <Package size={11} className="shrink-0" /> {c.item_title}
                                                </p>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs text-slate-500 truncate">
                                                        {c.last_message ? c.last_message.text : ''}
                                                    </span>
                                                    {c.unread_count > 0 && (
                                                        <span className="shrink-0 min-w-5 h-5 px-1.5 bg-[#1E85FF] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                            {c.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* ── Thread ──────────────────────────────────── */}
                    <div className={`${conversationId ? 'flex' : 'hidden md:flex'} flex-col min-h-0`}>
                        {!conversationId ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                                <MessageCircle size={48} className="mb-3 opacity-30" />
                                <p className="text-sm font-medium">{t('chat.selectPrompt')}</p>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
                                    <button onClick={() => navigate('/chat')} className="md:hidden p-1 text-slate-500 hover:text-slate-800">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-100">
                                        <img
                                            src={activeConversation?.other_user?.avatar || 'https://via.placeholder.com/120x120?text=User'}
                                            alt={activeConversation?.other_user?.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate">{activeConversation?.other_user?.name || ''}</p>
                                        {activeConversation?.item && (
                                            <button
                                                onClick={() => navigate(`/items/${activeConversation.item}`)}
                                                className="text-[11px] text-[#1E85FF] hover:underline truncate flex items-center gap-1"
                                            >
                                                <Package size={11} /> {activeConversation.item_title}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-2 bg-slate-50">
                                    {loadingThread ? (
                                        <div className="text-center text-slate-400 text-sm py-6">{t('chat.loading')}</div>
                                    ) : messages.length === 0 ? (
                                        <div className="text-center text-slate-400 text-sm py-6">{t('chat.noMessages')}</div>
                                    ) : (
                                        messages.map((m) => {
                                            const mine = String(m.sender) === myId;
                                            return (
                                                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${mine ? 'bg-[#1E85FF] text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md'}`}>
                                                        <p className="break-words whitespace-pre-wrap">{m.text}</p>
                                                        <p className={`text-[10px] mt-0.5 text-right ${mine ? 'text-blue-100' : 'text-slate-400'}`}>
                                                            {formatTime(m.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={bottomRef} />
                                </div>

                                {/* Composer */}
                                <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex items-center gap-2 shrink-0 bg-white">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={t('chat.inputPlaceholder')}
                                        className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1E85FF] focus:bg-white transition-all"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim()}
                                        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1E85FF] text-white hover:bg-blue-600 transition-colors disabled:opacity-40 active:scale-95"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
