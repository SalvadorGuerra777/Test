import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { stripThinking } from '../lib/text.js';
import { openReportInNewTab } from '../lib/report.js';
import { CORE_URL, REPORTS_URL } from '../lib/config.js';

const SUGGESTIONS = [
  'I want to test my support chatbot, it has a refund tool and a RAG knowledge base.',
  'Red-team my coding agent — it can read/write repo files and run shell commands.',
  'Check my RAG assistant for prompt injection via retrieved documents.'
];

function BotAvatar() {
  return (
    <span className="rx-chatv-avatar rx-chatv-avatar-bot">
      <Icon name="bot" size={16} />
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="rx-chatv-row rx-chatv-row-assistant">
      <BotAvatar />
      <div className="rx-chatv-msg rx-chatv-msg-assistant">
        <span className="rx-chatv-typing" aria-label="Rexor is thinking">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );
}

// Rexor's AI-driven front door: tell it what you want to test in plain
// language, it asks for whatever it's missing, then it drives the platform
// itself (list_target_types / create_test_plan / run_probes, via core's own
// MCP server) instead of you filling in the classic form step by step.
//
// conversationId is owned by App (so the history panel can jump this view
// to any past conversation, and so it can be restored after a reload) -
// this component just reacts to it: load that conversation's transcript
// whenever the id changes from outside, and tell the parent when a new one
// is created by sending the first message of a fresh chat.
export default function ChatView({ conversationId, onConversationIdChange }) {
  const [messages, setMessages] = useState([]); // [{role, content, report?}]
  const [hydrateStatus, setHydrateStatus] = useState('idle'); // idle | loading
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | error
  const [error, setError] = useState('');
  const [reportStatus, setReportStatus] = useState('idle'); // idle | running | error
  const [reportError, setReportError] = useState('');
  const scrollRef = useRef(null);
  const skipNextHydrate = useRef(false);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    if (skipNextHydrate.current) {
      skipNextHydrate.current = false;
      return;
    }
    setHydrateStatus('loading');
    fetch(`${CORE_URL}/api/chats.bxm?id=${encodeURIComponent(conversationId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || 'Could not load that conversation');
        setMessages(
          (data.messages || []).map((m) => ({
            role: m.role,
            content: m.role === 'assistant' ? stripThinking(m.content) : m.content
          }))
        );
      })
      .catch(() => {
        // Stale id (e.g. server restarted and lost its ephemeral storage) -
        // just start fresh instead of getting stuck.
        setMessages([]);
      })
      .finally(() => setHydrateStatus('idle'));
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  function send(ev, overrideText) {
    ev.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || status === 'sending') return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setStatus('sending');
    setError('');

    fetch(`${CORE_URL}/api/chat.bxm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, conversationId: conversationId || undefined })
    })
      .then((res) =>
        res
          .json()
          .catch(() => {
            throw new Error(`core returned a non-JSON response (HTTP ${res.status})`);
          })
          .then((data) => {
            if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
            return data;
          })
      )
      .then((data) => {
        if (!conversationId && data.conversationId) {
          skipNextHydrate.current = true;
          onConversationIdChange(data.conversationId);
        }
        setMessages((prev) => [...prev, { role: 'assistant', content: stripThinking(data.reply), report: data.report || null }]);
        setStatus('idle');
      })
      .catch((err) => {
        setError(err.message || String(err));
        setStatus('error');
      });
  }

  function viewReport(report) {
    setReportStatus('running');
    setReportError('');
    openReportInNewTab(report, REPORTS_URL)
      .then(() => setReportStatus('idle'))
      .catch((err) => {
        setReportError(err.message || String(err));
        setReportStatus('error');
      });
  }

  function startOver() {
    setMessages([]);
    onConversationIdChange('');
    setError('');
    setStatus('idle');
  }

  if (hydrateStatus === 'loading') {
    return (
      <div className="rx-chatv-page rx-chatv-empty-page">
        <div className="rx-chatv-hero">
          <span className="rx-chatv-hero-mark">
            <Icon name="bot" size={22} />
          </span>
          <p className="lede">Loading conversation&hellip;</p>
        </div>
      </div>
    );
  }

  const empty = messages.length === 0;

  const composer = (
    <form className="rx-chatv-composer" onSubmit={send}>
      <textarea
        className="rx-input rx-chatv-input"
        rows={empty ? 2 : 1}
        placeholder="I want to test my bot..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send(e);
          }
        }}
        autoFocus
      />
      <Button
        type="submit"
        variant="primary"
        className="rx-chatv-send"
        disabled={status === 'sending' || !input.trim()}
        aria-label="Send"
      >
        <Icon name="arrowUp" size={16} />
      </Button>
    </form>
  );

  if (empty) {
    return (
      <div className="rx-chatv-page rx-chatv-empty-page">
        <div className="rx-chatv-hero">
          <span className="rx-chatv-hero-mark">
            <Icon name="bot" size={22} />
          </span>
          <div className="eyebrow">Rexor assistant</div>
          <h1 className="page-title">What do you want to test today?</h1>
          <p className="lede">
            Describe the bot or agent in plain language. Rexor will ask for whatever it's missing, then build the
            ATLAS test plan and run it itself.
          </p>
          {composer}
          <div className="rx-chatv-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="rx-chatv-chip" onClick={(ev) => send(ev, s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rx-chatv-page">
      <div className="rx-chatv-bar">
        <span className="rx-chatv-bar-tag">
          <Icon name="bot" size={16} />
          Rexor assistant
        </span>
        <Button variant="ghost" size="sm" onClick={startOver} type="button">
          New chat
        </Button>
      </div>

      <div className="rx-chatv-messages rx-scroll" ref={scrollRef}>
        <div className="rx-chatv-thread">
          {messages.map((m, i) => (
            <div key={i} className={`rx-chatv-row rx-chatv-row-${m.role}`}>
              {m.role === 'assistant' ? <BotAvatar /> : null}
              <div className={`rx-chatv-msg rx-chatv-msg-${m.role}`}>
                {m.role === 'assistant' ? <div dangerouslySetInnerHTML={{ __html: marked.parse(m.content) }} /> : m.content}
                {m.report ? (
                  <div className="rx-chatv-report-action">
                    <Button variant="primary" size="sm" onClick={() => viewReport(m.report)} disabled={reportStatus === 'running'}>
                      {reportStatus === 'running' ? 'Building report…' : 'View full report'}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {status === 'sending' ? <TypingIndicator /> : null}
          {status === 'error' ? <div className="rx-chatv-msg rx-chatv-msg-error">Could not reach Rexor: {error}</div> : null}
          {reportStatus === 'error' ? <div className="rx-chatv-msg rx-chatv-msg-error">Could not build the report: {reportError}</div> : null}
        </div>
      </div>

      <div className="rx-chatv-composer-row">{composer}</div>
    </div>
  );
}
