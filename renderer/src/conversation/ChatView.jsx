import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessage from '../ChatMessage';
import ChatInput from '../ChatInput';
import { getCurrentId, createSession, getCurrentSession, addMessage } from './SessionStore';

const JULIA = window.juliaAPI;

/**
 * ChatView — main conversation interface with session persistence.
 * Phase E0.6: localStorage session continuity. No Core dependency.
 */
export default function ChatView({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [persona, setPersona] = useState('Julia');
  const [activeSessionId, setActiveSessionId] = useState(sessionId || getCurrentId());
  const messagesEnd = useRef(null);

  // Ensure a session exists
  useEffect(() => {
    let sid = activeSessionId || getCurrentId();
    if (!sid) {
      const session = createSession();
      sid = session.id;
    }
    setActiveSessionId(sid);
    // Load existing messages
    const session = getCurrentSession();
    if (session && session.messages) {
      setMessages(session.messages.map((m) => ({ ...m })));
    }
  }, [sessionId]);

  useEffect(() => {
    async function check() {
      const health = await JULIA.checkHealth();
      setIsOnline(health.online);
    }
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    JULIA.onResponse((data) => {
      setIsThinking(false);
      setMessages((prev) => {
        const next = [...prev, { role: 'julia', text: data.text, timestamp: data.timestamp }];
        if (activeSessionId) addMessage(activeSessionId, 'julia', data.text);
        return next;
      });
    });
    JULIA.onError((data) => {
      setIsThinking(false);
      setMessages((prev) => {
        const next = [...prev, { role: 'julia', text: `抱歉，暂时无法连接：${data.message}`, isError: true }];
        if (activeSessionId) addMessage(activeSessionId, 'julia', data.text);
        return next;
      });
    });
    JULIA.onStatus((data) => {
      if (data.status === 'thinking') setIsThinking(true);
    });
    return () => {
      JULIA.removeAllListeners('julia:response');
      JULIA.removeAllListeners('julia:error');
      JULIA.removeAllListeners('julia:status');
    };
  }, [activeSessionId]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = useCallback((text) => {
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setIsThinking(true);
    if (activeSessionId) addMessage(activeSessionId, 'user', text);
    JULIA.sendMessage(text);
  }, [activeSessionId]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.chatTitle}>Conversation</span>
        <span style={{ fontSize: '11px', color: isOnline ? '#4CAF50' : '#f44336' }}>
          {isOnline ? '  Online' : '  Offline'}
        </span>
      </div>
      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.welcome}>
            <p style={styles.welcomeEmoji}> </p>
            <p style={styles.welcomeText}>我是 Julia，你的个人 AI 助手。</p>
            <p style={styles.welcomeHint}>输入文字，开始对话。</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} {...msg} />
        ))}
        {isThinking && <ChatMessage role="julia" text="..." isThinking />}
        <div ref={messagesEnd} />
      </div>
      <ChatInput onSend={handleSend} disabled={!isOnline} />
    </div>
  );
}

const styles = {
  container: { height: '100%', display: 'flex', flexDirection: 'column' },
  header: {
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    WebkitAppRegion: 'no-drag',
  },
  chatTitle: { fontSize: '13px', fontWeight: 600, color: '#aaa' },
  messages: { flex: 1, overflowY: 'auto', padding: '16px' },
  welcome: { textAlign: 'center', marginTop: '40%', opacity: 0.6 },
  welcomeEmoji: { fontSize: '48px', marginBottom: '12px' },
  welcomeText: { fontSize: '16px', fontWeight: 500, marginBottom: '8px' },
  welcomeHint: { fontSize: '13px', color: '#888' },
};
