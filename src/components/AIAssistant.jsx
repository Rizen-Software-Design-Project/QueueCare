import { useState, useRef, useEffect } from 'react';
import './AIAssistant.css';

// The AI chat server address - uses local in development or the live Azure one in production. This is just for us not to mess things up AZURE was a pain
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

  const role  = context?.role || 'patient';
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

  // Show the greeting message the very first time the user opens the chat window
  useEffect(() => {
    if (open) {
      setHasNew(false);
      setTimeout(() => inputRef.current?.focus(), 100);
      if (messages.length === 0) {
        const greetings = {
          patient:   `Hi ${context?.profile?.name || 'there'}! I can help you book appointments, check your queue position, find clinics, or answer any questions about your care. What do you need?`,
          staff:     `Hi ${context?.profile?.name || 'there'}! I can help you manage the queue, appointments, create slots, or check clinic analytics. What do you need?`,
          admin:     `Hi ${context?.profile?.name || 'there'}! I can help you with applications, staff management, facility operations, and system analytics. What would you like to do?`,
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

  // Automatically scroll down to the newest message whenever a new one arrives
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

      const data  = await res.json();
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

  // If the user presses Shift+Enter, add a new line; if just Enter, send the message
  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    // The chat window floats over the page like a help panel
    <aside className="ai-bubble">

      {open && (
        <section className="ai-window">

          <header className="ai-header">
            {/* The AI assistant's avatar picture and name */}
            <figure className="ai-header-left">
              {/* The emoji icon for the AI - hidden from screen readers since it is decorative */}
              <i className="ai-avatar" aria-hidden="true">🤖</i>
              <figcaption>
                <strong className="ai-header-title">{roleLabel}</strong>
                <small className="ai-header-sub">{roleSubLabel}</small>
              </figcaption>
            </figure>
            <button className="ai-close-btn" onClick={() => setOpen(false)}>✕</button>
          </header>

          {/* Quick suggestion buttons that appear only at the start so they do not get in the way later */}
          {messages.length === 1 && (
            // A list of quick prompts the user can click to start a conversation
            <menu className="ai-suggestions">
              {chips.map(chip => (
                <li key={chip}>
                  <button
                    className="ai-suggestion-chip"
                    onClick={() => send(chip)}
                  >
                    {chip}
                  </button>
                </li>
              ))}
            </menu>
          )}

          {/* The list of all chat messages in the order they were sent */}
          <ol className="ai-messages">
            {messages.map((m, i) => (
              <li key={i} className={`ai-msg ai-msg--${m.role}`}>
                <p className="ai-msg-bubble">{m.content}</p>
                {/* The time each message was sent */}
                <time className="ai-msg-time">{formatTime(m.time)}</time>
              </li>
            ))}

            {loading && (
              <li className="ai-msg ai-msg--assistant">
                <p className="ai-typing">
                  {/* Animated dots shown while the AI is thinking of a reply */}
                  <i className="ai-typing-dot" />
                  <i className="ai-typing-dot" />
                  <i className="ai-typing-dot" />
                </p>
              </li>
            )}

            {/* An invisible marker at the bottom of the list - scrolling to it keeps the newest message visible */}
            <li ref={bottomRef} aria-hidden="true" />
          </ol>

          {/* The text box and send button at the bottom of the chat window */}
          <footer className="ai-input-area">
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
          </footer>

        </section>
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
        {/* A little red dot on the chat button when there is a new reply waiting to be read */}
        {hasNew && <mark className="ai-unread-dot" />}
      </button>

    </aside>
  );
}