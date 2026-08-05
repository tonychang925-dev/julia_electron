import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessage from '../ChatMessage';
import ChatInput from '../ChatInput';
import RuntimeTimeline from '../runtime/RuntimeTimeline';
import { getCurrentId, createSession, setCurrentId, addMessage, loadSession } from './SessionStore';

const API = window.juliaAPI;

/**
 * ChatView — Protocol v1 Generic Client with session persistence.
 * Knows: user.message → runtime.event. Does NOT know Julia's identity.
 * Session messages are saved to Core via SessionStore for auto-title.
 */
export default function ChatView({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState('idle');
  const [online, setOnline] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(sessionId || getCurrentId());
  const messagesEnd = useRef(null);
  const cleanupRef = useRef(null);

  // Load messages when session changes
  useEffect(() => {
    if (!sessionId) return;
    setActiveSessionId(sessionId);
    setCurrentId(sessionId);
    (async () => {
      const s = await loadSession(sessionId);
      if (s?.messages?.length) {
        setMessages(s.messages.map((m) => ({
          role: m.role === 'assistant' ? 'julia' : m.role,
          text: m.content || m.text || '',
        })));
      } else {
        setMessages([]);
      }
    })();
  }, [sessionId]);

  // Sync WS session.bind when active session changes
  useEffect(() => {
    if (activeSessionId) API.bindSession(activeSessionId);
  }, [activeSessionId]);

  // Auto-create session if none exists
  useEffect(() => {
    if (!sessionId && !getCurrentId()) {
      createSession().then((s) => {
        if (s?.id) {
          setActiveSessionId(s.id);
          setCurrentId(s.id);
        }
      });
    }
  }, []);

  // Subscribe to Gateway events
  useEffect(() => {
    const unsub = API.subscribe((evt) => {
      const { type, category, event, data } = evt;
      if (type === 'gateway.connected' || (category === 'runtime' && event === 'gateway.ready')) {
        setOnline(true);
        return;
      }
      if (type === 'gateway.disconnected') { setOnline(false); return; }
      if (category === 'presence' && event === 'changed') {
        const state = data?.state || 'idle';
        setPresence(state);
        return;
      }
      // E3: handle streaming chunks + full reply
      if (category === 'conversation' && event === 'message.sent') {
        const reply = data?.reply || '';
        if (reply) {
          setMessages((prev) => [...prev, { role: 'julia', text: reply }]);
          if (activeSessionId) addMessage(activeSessionId, 'julia', reply);
        }
        setPresence('idle');
      }
      if (category === 'assistant' && event === 'chunk') {
        const text = data?.text || '';
        if (text) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'julia' && !last.isFinal) {
              return [...prev.slice(0, -1), { ...last, text: last.text + text }];
            }
            return [...prev, { role: 'julia', text, isFinal: false }];
          });
        }
      }
      if (category === 'assistant' && event === 'completed') {
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          if (last.role === 'julia') {
            const final = { ...last, isFinal: true };
            if (activeSessionId) addMessage(activeSessionId, 'julia', final.text);
            return [...prev.slice(0, -1), final];
          }
          return prev;
        });
      }
      // E3.4: speech.* events
      if (category === 'speech' && event === 'started') {
        setPresence('speaking');
      }
      if (category === 'speech' && (event === 'completed' || event === 'cancelled')) {
        setPresence('idle');
      }
    });
    cleanupRef.current = unsub;
    return () => { if (cleanupRef.current) cleanupRef.current(); };
  }, [activeSessionId]);

  useEffect(() => {
    API.checkHealth().then((h) => { if (h?.status === 'ok') setOnline(true); }).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice transcript: display only. Gateway handles the chat.
  const handleVoiceTranscript = useCallback((text) => {
    setMessages((prev) => [...prev, { role: 'user', text, source: 'voice' }]);
    if (activeSessionId) addMessage(activeSessionId, 'user', text);
  }, [activeSessionId]);

  const handleSend = useCallback((text) => {
    setMessages((prev) => [...prev, { role: 'user', text }]);
    if (activeSessionId) addMessage(activeSessionId, 'user', text);
    API.sendMessage(text, activeSessionId);
  }, [activeSessionId]);

  const handlePresence = useCallback((state) => {
    if (state) setPresence(state);
  }, []);

  const isListening = presence === 'listening';
  const isThinking = presence === 'thinking';
  const phaseLabels = { recalling: '  Recalling...', reasoning: '  Reasoning...', generating: '  Generating...', speaking: '  Speaking...' };
  const statusLabel = presence === 'interrupt' ? '  Interrupted'
    : isListening ? '  Listening...'
    : phaseLabels[presence] || (isThinking ? '  Thinking...' : '')
    || (online ? '  Online' : '  Offline');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.chatTitle}>Conversation</span>
        <span style={{ fontSize: '11px', color: online ? '#4CAF50' : '#f44336' }}>{statusLabel}</span>
      </div>
      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.welcome}>
            <p style={styles.welcomeEmoji}> </p>
            <p style={styles.welcomeText}>Say hello.</p>
          </div>
        )}
        {messages.map((msg, i) => <ChatMessage key={i} {...msg} />)}
        {isThinking && <ChatMessage role="julia" text="..." isThinking />}
        <div ref={messagesEnd} />
      </div>
      <RuntimeTimeline />
      <ChatInput onSend={handleSend} onVoiceTranscript={handleVoiceTranscript} sessionId={activeSessionId} disabled={!online} />
    </div>
  );
}

const styles = {
  container: { height: '100%', display: 'flex', flexDirection: 'column' },
  header: { padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', WebkitAppRegion: 'no-drag' },
  chatTitle: { fontSize: '13px', fontWeight: 600, color: '#aaa' },
  messages: { flex: 1, overflowY: 'auto', padding: '16px' },
  welcome: { textAlign: 'center', marginTop: '40%', opacity: 0.6 },
  welcomeEmoji: { fontSize: '48px', marginBottom: '12px' },
  welcomeText: { fontSize: '16px', fontWeight: 500, color: '#ccc' },
};
