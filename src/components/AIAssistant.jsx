import { useState, useRef, useEffect } from 'react';
import './AIAssistant.css';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  'https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net';

const SUGGESTIONS = {
  patient: [
    'What are my upcoming appointments?',
    'Where am I in the queue?',
    'Find clinics near Johannesburg',
    'Book me the earliest available slot',
    'Cancel my next appointment',
  ],
  staff: [
    'Who is next in the queue?',
    'How many patients are waiting?',
    "Show today's appointments",
    'Create a slot for tomorrow at 9am',
    "What's the no-show rate this week?",
  ],
  admin: [
    'How many pending applications?',
    'Which clinic has the highest no-show rate?',
    'Show all staff members',
    'List clinics in Gauteng',
    'What are the average wait times?',
  ],
  analytics: [
    'What is the peak hour today?',
    'Which day had the most no-shows?',
    'Summarise the wait time trends',
    'Export the current report',
  ],
};

function formatTime(date) {
  return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

export default function AIAssistant({ context }) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [hasNew, setHasNew]     = useState(false);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  const role = context?.role || 'patient';
  const chips = SUGGESTIONS[role] || SUGGESTIONS.patient;

  const roleLabel = {
    patient:   'Patient Assistant',
    staff:     'Staff Assistant',
    admin:     'Admin Assistant',
    analytics: 'Analytics Assistant',
  }[role] || 'QueueCare AI';

  const roleSubLabel = {
    patient:   'Book, queue & manage appointments',
    staff:     'Queue, patients & clinic operations',
    admin:     'Applications, staff & analytics',
    analytics: 'Charts, insights & exports',
  }[role] || 'Your healthcare assistant';

  useEffect(() => {
    if (open) {
      setHasNew(false);
      setTimeout(() => inputRef.current?.focus(), 100);
      if (messages.length === 0) {
        const greetings = {
          patient: `Hi ${context?.profile?.name || 'there'}! I can help you book appointments, check your queue position, find clinics, or answer any questions about your care. What do you need?`,
          staff:   `Hi ${context?.profile?.name || 'there'}! I can help you manage the queue, appointments, create slots, or check clinic analytics. What do you need?`,
          admin:   `Hi ${context?.profile?.name || 'there'}! I can help you with applications, staff management, facility operations, and system analytics. What would you like to do?`,
          analytics: `Hi! I can answer questions about the data on this page — wait times, no-show rates, trends, and more. What would you like to know?`,
        };
        setMessages([{
          role: 'assistant',
          content: greetings[role] || 'Hi! How can I help you today?',
          time: new Date(),
        }]);
      }
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');
    const userMsg = { role: 'user', content: userText, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg]
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, context }),
      });

      const data = await res.json();
      const reply = data.reply || data.error || 'Something went wrong. Please try again.';

      setMessages(prev => [...prev, { role: 'assistant', content: reply, time: new Date() }]);

      if (!open) setHasNew(true);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I could not connect to the AI service. Please check your connection and try again.',
        time: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="ai-bubble">
      {open && (
        <div className="ai-window">
          <div className="ai-header">
            <div className="ai-header-left">
              <div className="ai-avatar">🤖</div>
              <div>
                <div className="ai-header-title">{roleLabel}</div>
                <div className="ai-header-sub">{roleSubLabel}</div>
              </div>
            </div>
            <button className="ai-close-btn" onClick={() => setOpen(false)}>✕</button>
          </div>

          {messages.length === 1 && (
            <div className="ai-suggestions">
              {chips.map(chip => (
                <button
                  key={chip}
                  className="ai-suggestion-chip"
                  onClick={() => send(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div className="ai-messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg--${m.role}`}>
                <div className="ai-msg-bubble">{m.content}</div>
                <span className="ai-msg-time">{formatTime(m.time)}</span>
              </div>
            ))}
            {loading && (
              <div className="ai-msg ai-msg--assistant">
                <div className="ai-typing">
                  <div className="ai-typing-dot" />
                  <div className="ai-typing-dot" />
                  <div className="ai-typing-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="ai-input-area">
            <textarea
              ref={inputRef}
              className="ai-input"
              placeholder="Ask anything…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button
              className="ai-send-btn"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <button
        className="ai-trigger"
        onClick={() => setOpen(v => !v)}
        aria-label="Open AI assistant"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10H2l2.5-2.5A9.96 9.96 0 0 1 2 12 10 10 0 0 1 12 2z"/>
            <path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth="2.5"/>
          </svg>
        )}
        {hasNew && <span className="ai-unread-dot" />}
      </button>
    </div>
  );
}
