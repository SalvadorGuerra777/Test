import { useEffect, useState } from 'react';
import SegmentedControl from './SegmentedControl.jsx';
import Icon from './Icon.jsx';
import ReportList, { useReports } from './ReportList.jsx';
import { CORE_URL } from '../lib/config.js';

// Past chats and past reports, both backed by files core writes on its own
// (api/chats.bxm, api/reports.bxm). Reports are also always on screen in the
// right rail on desktop; this drawer is where chats live, and where reports
// are reachable on small screens.
export default function HistoryPanel({ open, onClose, onSelectChat, refreshKey }) {
  const [tab, setTab] = useState('chats');
  const [chats, setChats] = useState([]);
  const [chatStatus, setChatStatus] = useState('loading');
  const [chatError, setChatError] = useState('');
  const reportsState = useReports(refreshKey, open && tab === 'reports');

  useEffect(() => {
    if (!open || tab !== 'chats') return;
    setChatStatus('loading');
    fetch(`${CORE_URL}/api/chats.bxm`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || 'Request failed');
        setChats(data.chats || []);
        setChatStatus('idle');
      })
      .catch((err) => {
        setChatError(err.message || String(err));
        setChatStatus('error');
      });
  }, [open, tab, refreshKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="rx-history-scrim" onClick={onClose} />
      <aside className="rx-history-panel" role="dialog" aria-label="History">
        <div className="rx-history-head">
          <span className="rx-history-title">History</span>
          <button type="button" className="rx-history-close" onClick={onClose} aria-label="Close history">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="rx-history-tabs">
          <SegmentedControl
            label="History type"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'chats', label: 'Chats' },
              { value: 'reports', label: 'Reports' }
            ]}
          />
        </div>

        <div className="rx-history-list rx-scroll">
          {tab === 'reports' ? <ReportList {...reportsState} /> : null}

          {tab === 'chats' && chatStatus === 'loading' ? <div className="rx-history-empty">Loading&hellip;</div> : null}
          {tab === 'chats' && chatStatus === 'error' ? <div className="rx-history-empty">Could not load chats: {chatError}</div> : null}
          {tab === 'chats' && chatStatus === 'idle' && chats.length === 0 ? (
            <div className="rx-history-empty">No chats yet. Start one and it'll show up here.</div>
          ) : null}
          {tab === 'chats' && chatStatus === 'idle'
            ? chats.map((c) => (
                <button
                  key={c.conversationId}
                  type="button"
                  className="rx-history-item"
                  onClick={() => {
                    onSelectChat(c.conversationId);
                    onClose();
                  }}
                >
                  <span className="rx-history-item-title">{c.title}</span>
                  <span className="rx-history-item-meta">
                    {c.messageCount} messages &middot; {c.updatedAt}
                  </span>
                </button>
              ))
            : null}
        </div>
      </aside>
    </>
  );
}
