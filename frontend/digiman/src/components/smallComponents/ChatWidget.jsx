import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// Inline styles — uses CSS vars from theme.css for dark/light support
// ---------------------------------------------------------------------------
const S = {
  fab: (open) => ({
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 1050,
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#000',
    border: 'none',
    boxShadow: '0 4px 16px rgba(0,0,0,.35)',
    fontSize: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform .2s',
    transform: open ? 'rotate(45deg)' : 'none',
  }),
  panel: (open) => ({
    position: 'fixed',
    bottom: 92,
    right: 24,
    zIndex: 1050,
    width: 360,
    maxWidth: 'calc(100vw - 48px)',
    height: 520,
    maxHeight: 'calc(100vh - 120px)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 16,
    overflow: 'hidden',
    background: 'var(--surface)',
    boxShadow: '0 8px 32px rgba(0,0,0,.4)',
    border: '1px solid rgba(255,255,255,.08)',
    // slide-up animation via opacity/transform
    opacity: open ? 1 : 0,
    transform: open ? 'translateY(0)' : 'translateY(20px)',
    pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity .2s ease, transform .2s ease',
  }),
  header: {
    padding: '14px 16px',
    background: 'var(--accent)',
    color: '#000',
    fontWeight: 700,
    fontSize: 15,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  bubble: (isBot) => ({
    maxWidth: '82%',
    alignSelf: isBot ? 'flex-start' : 'flex-end',
    background: isBot ? 'var(--app-bg)' : 'var(--accent)',
    color: isBot ? 'var(--app-fg)' : '#000',
    borderRadius: isBot ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
    padding: '8px 12px',
    fontSize: 13.5,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    boxShadow: '0 1px 4px rgba(0,0,0,.18)',
  }),
  intentBadge: (intent) => ({
    display: 'inline-block',
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 8,
    marginBottom: 4,
    background:
      intent === 'recommendation'
        ? 'rgba(99,102,241,.25)'
        : intent === 'navigation'
        ? 'rgba(34,197,94,.25)'
        : 'rgba(251,191,36,.25)',
    color:
      intent === 'recommendation'
        ? '#0b31ed'
        : intent === 'navigation'
        ? '#009c39'
        : '#d4b22d',
    fontWeight: 600,
    letterSpacing: '.5px',
    textTransform: 'uppercase',
  }),
  footer: {
    padding: '10px 12px',
    borderTop: '1px solid rgba(255,255,255,.07)',
    display: 'flex',
    gap: 8,
    background: 'var(--surface)',
  },
  input: {
    flex: 1,
    borderRadius: 22,
    border: '1px solid rgba(255,255,255,.12)',
    background: 'var(--bg)',
    color: 'var(--text)',
    padding: '8px 14px',
    fontSize: 13.5,
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.4,
  },
  sendBtn: (disabled) => ({
    border: 'none',
    borderRadius: '50%',
    width: 38,
    height: 38,
    background: disabled ? 'rgba(255,212,0,.35)' : 'var(--accent)',
    color: '#000',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background .15s',
    alignSelf: 'flex-end',
  }),
};

// ---------------------------------------------------------------------------
// Known navigation paths that should be linkified in bot answers.
// ---------------------------------------------------------------------------
const NAV_PATHS = [
  '/search/advanced',
  '/downloads',
  '/pricing',
  '/library',
  '/settings',
  '/profile',
  '/register',
  '/login',
];
const NAV_PATH_REGEX = new RegExp(
  `(${NAV_PATHS.map((p) => p.replace(/\//g, '\\/')).join('|')})`,
  'g',
);

function _linkifyNavPaths(text, isAuthenticated, keyPrefix) {
  return text.split(NAV_PATH_REGEX).map((part, i) => {
    if (NAV_PATHS.includes(part)) {
      // Two-flow login: already logged-in users are sent to /profile
      const href = part === '/login' && isAuthenticated ? '/profile' : part;
      return (
        <a
          key={`${keyPrefix}-nav-${i}`}
          href={href}
          style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Render answer text with manga titles AND nav paths replaced by inline links.
// manga_cards: [{id, title}] — only DB-matched titles get linked.
// ---------------------------------------------------------------------------
function renderAnswerWithLinks(text, manga_cards, isAuthenticated) {
  // Pass 1 — linkify manga titles
  let segments = [text];
  if (manga_cards?.length) {
    const sorted = [...manga_cards].sort((a, b) => b.title.length - a.title.length);
    const pattern = sorted
      .map((m) => m.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    const regex = new RegExp(`(${pattern})`, 'i');
    segments = text.split(regex).map((part, i) => {
      const match = sorted.find((m) => m.title.toLowerCase() === part.toLowerCase());
      if (match) {
        return (
          <a
            key={`manga-${i}`}
            href={`/manga/${match.id}`}
            style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  }

  // Pass 2 — linkify nav paths within remaining string segments
  return segments.flatMap((segment, si) => {
    if (typeof segment !== 'string') return [segment];
    return _linkifyNavPaths(segment, isAuthenticated, si);
  });
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <div style={S.bubble(true)}>
      <span style={{ display: 'flex', gap: 4, alignItems: 'center', height: 16 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--muted)',
              animation: `digibotBounce 1.2s ${i * 0.2}s infinite ease-in-out`,
            }}
          />
        ))}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------
const WELCOME = {
  role: 'bot',
  content:
    'Hi! I\'m DigiBot 👋\nI can help you navigate Digiman, explain features, or recommend manga.\nWhat can I do for you?',
  intent: null,
};

export default function ChatWidget() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('digibot_messages');
      return saved ? JSON.parse(saved) : [WELCOME];
    } catch {
      return [WELCOME];
    }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Persist messages to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('digibot_messages', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    // Build history for backend (exclude welcome message)
    const history = nextMessages
      .slice(1) // skip WELCOME
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'bot', content: m.content }));

    try {
      const res = await api.post('chatbot/chat/', { message: text, history });
      const { intent, answer, manga_cards = [] } = res.data;
      setMessages((prev) => [...prev, { role: 'bot', content: answer, intent, manga_cards }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Sorry, something went wrong. Please try again.', intent: null },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Keyframe for typing dots */}
      <style>{`
        @keyframes digibotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>

      {/* Chat panel */}
      <div style={S.panel(open)} role="dialog" aria-label="DigiBot chat">
        {/* Header */}
        <div style={S.header}>
          <span>🤖</span>
          <span>DigiBot</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, opacity: .7 }}>
            Manga assistant
          </span>
        </div>

        {/* Message list */}
        <div style={S.messages}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'bot' ? 'flex-start' : 'flex-end' }}
            >
              {msg.role === 'bot' && msg.intent && (
                <span style={S.intentBadge(msg.intent)}>{msg.intent}</span>
              )}
              <div style={S.bubble(msg.role === 'bot')}>
                {msg.role === 'bot'
                  ? renderAnswerWithLinks(msg.content, msg.manga_cards, isAuthenticated)
                  : msg.content}
              </div>
            </div>
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input footer */}
        <div style={S.footer}>
          <textarea
            ref={inputRef}
            style={S.input}
            rows={1}
            placeholder="Ask me anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
          />
          <button
            style={S.sendBtn(loading || !input.trim())}
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            {/* Simple paper-plane icon using Unicode */}
            ➤
          </button>
        </div>
      </div>

      {/* FAB toggle */}
      <button
        style={S.fab(open)}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open DigiBot'}
      >
        {open ? '✕' : '🤖'}
      </button>
    </>
  );
}
