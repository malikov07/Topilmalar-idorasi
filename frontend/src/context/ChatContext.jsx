import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../service/api';

const ChatContext = createContext(null);

// Build the ws:// (or wss://) URL from the REST base URL.
const buildWsUrl = (token) => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/';
    const url = new URL(base);
    const proto = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${url.host}/ws/chat/?token=${encodeURIComponent(token)}`;
};

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [connected, setConnected] = useState(false);

    const socketRef = useRef(null);
    const reconnectRef = useRef(null);
    const listenersRef = useRef(new Set());
    const shouldConnectRef = useRef(false);
    const connectRef = useRef(null);

    const refreshUnread = useCallback(async () => {
        try {
            const res = await api.get('/api/chat/unread-count/');
            setUnreadTotal(res.data?.unread || 0);
        } catch {
            // ignore (likely not logged in)
        }
    }, []);

    const connect = useCallback(() => {
        const token = localStorage.getItem('access');
        if (!token || !shouldConnectRef.current) return;
        if (socketRef.current && socketRef.current.readyState <= 1) return; // connecting/open

        const ws = new WebSocket(buildWsUrl(token));
        socketRef.current = ws;

        ws.onopen = () => setConnected(true);

        ws.onmessage = (event) => {
            let data;
            try { data = JSON.parse(event.data); } catch { return; }
            if (data.type === 'message' && data.message) {
                listenersRef.current.forEach((fn) => fn(data.message));
                refreshUnread();
            }
        };

        ws.onclose = () => {
            setConnected(false);
            socketRef.current = null;
            if (shouldConnectRef.current) {
                clearTimeout(reconnectRef.current);
                reconnectRef.current = setTimeout(() => connectRef.current?.(), 3000);
            }
        };

        ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
    }, [refreshUnread]);

    // Keep a live reference so the reconnect timer always calls the latest connect.
    useEffect(() => { connectRef.current = connect; }, [connect]);

    // Open/close the socket as the user logs in/out.
    useEffect(() => {
        if (user) {
            shouldConnectRef.current = true;
            connect();
            refreshUnread();
        } else {
            shouldConnectRef.current = false;
            setUnreadTotal(0);
        }

        return () => {
            shouldConnectRef.current = false;
            clearTimeout(reconnectRef.current);
            if (socketRef.current) {
                try { socketRef.current.close(); } catch { /* noop */ }
                socketRef.current = null;
            }
        };
    }, [user, connect, refreshUnread]);

    const sendMessage = useCallback((conversationId, text) => {
        const ws = socketRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('Chat socket not connected.');
            return false;
        }
        ws.send(JSON.stringify({ action: 'send', conversation_id: conversationId, text }));
        return true;
    }, []);

    const notifyRead = useCallback((conversationId) => {
        const ws = socketRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'read', conversation_id: conversationId }));
        }
        refreshUnread();
    }, [refreshUnread]);

    const subscribeToMessages = useCallback((handler) => {
        listenersRef.current.add(handler);
        return () => listenersRef.current.delete(handler);
    }, []);

    return (
        <ChatContext.Provider
            value={{ unreadTotal, connected, sendMessage, notifyRead, subscribeToMessages, refreshUnread }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
