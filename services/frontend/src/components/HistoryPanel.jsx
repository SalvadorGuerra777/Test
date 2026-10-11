import { useEffect, useState } from 'react';
import SegmentedControl from './SegmentedControl.jsx';
import StatusPill from './StatusPill.jsx';
import Icon from './Icon.jsx';
import { CORE_URL, REPORTS_URL } from '../lib/config.js';
import { openReportInNewTab } from '../lib/report.js';

// Past chats and past reports, both backed by files core writes on its own
// (api/chats.bxm, api/reports.bxm) - every run_probes call archives its
// report regardless of whether it came from the chat or the classic form,
// so this is one history for both.
export default function HistoryPanel({ open, onClose, onSelectChat }) {
  const [tab, setTab] = useState('chats');
  const [chats, setChats] = useState([]);
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState('');

  useEffect(() => {
    if (!open) return;
    setStatus('loading');
    setError('');
    const path = tab === 'chats' ? '/api/chats.bxm' : '/api/reports.bxm';
    fetch(`${CORE_URL}${path}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || `HTTP error`);
        if (tab === 'chats') setChats(data.chats || []);
        else setReports(data.reports || []);
        setStatus('idle');
      })
      .catch((err) => {
        setError(err.message || String(err));
        setStatus('error');
      });
  }, [open, tab]);

  function openReport(reportId) {
    setOpeningId(reportId);
    fetch(`${CORE_URL}/api/reports.bxm?id=${encodeURIComponent(reportId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || 'Could not load that report');
        return openReportInNewTab(data.report, REPORTS_URL);
      })
      .catch((err) => setError(err.message || String(err)))
      .finally(() => setOpeningId(''));
  }

  if (!open) return null;

  return (
    <>
      <div className="rx-history-scrim" onClick={onClose} />
      <aside className="rx-history-panel">
        <div className="rx-history-head">
          <span className="rx-history-title">History</span>
          <button type="button" className="rx-history-close" onClick={onClose} aria-label="Close history">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="rx-history-tabs">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'chats', label: 'Chats' },
              { value: 'reports', label: 'Reports' }
            ]}
          />
        </div>

        <div className="rx-history-list rx-scroll">
          {status === 'loading' ? <div className="rx-history-empty">Loading&hellip;</div> : null}
          {status === 'error' ? <div className="rx-history-empty">Could not load: {error}</div> : null}

          {status === 'idle' && tab === 'chats' && chats.length === 0 ? (
            <div className="rx-history-empty">No chats yet — start one and it'll show up here.</div>
          ) : null}
          {status === 'idle' && tab === 'reports' && reports.length === 0 ? (
            <div className="rx-history-empty">No reports yet — run some probes first.</div>
          ) : null}

          {tab === 'chats'
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

          {tab === 'reports'
            ? reports.map((r) => (
                <button
                  key={r.report_id}
                  type="button"
                  className="rx-history-item"
                  onClick={() => openReport(r.report_id)}
                  disabled={openingId === r.report_id}
                >
                  <span className="rx-history-item-title">{r.target}</span>
                  <span className="rx-history-item-meta">
                    <StatusPill status={r.vulnerabilities > 0 ? 'vulnerable' : 'defended'} />
                    {r.vulnerabilities}/{r.probes_run} vulnerable &middot; risk {r.risk_score} &middot; {r.started_at}
                  </span>
                </button>
              ))
            : null}
        </div>
      </aside>
    </>
  );
}
