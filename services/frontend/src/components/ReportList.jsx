import { useEffect, useState } from 'react';
import StatusPill from './StatusPill.jsx';
import { CORE_URL } from '../lib/config.js';
import { reportUrl } from '../lib/report.js';

// Fetches the archived reports list (api/reports.bxm). `refreshKey` is
// bumped by the app whenever a new report is produced, so open lists pick
// it up without polling.
export function useReports(refreshKey, enabled = true) {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | idle | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setStatus((s) => (s === 'idle' ? 'idle' : 'loading'));
    fetch(`${CORE_URL}/api/reports.bxm`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) throw new Error(data.error || 'Request failed');
        setReports(data.reports || []);
        setStatus('idle');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || String(err));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, enabled]);

  return { reports, status, error };
}

function formatWhen(startedAt) {
  // "yyyy-MM-dd HH:mm:ss" from core -> "Oct 11, 18:15"
  const d = new Date(String(startedAt).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return startedAt;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ReportList({ reports, status, error }) {
  if (status === 'loading') return <div className="rx-history-empty">Loading&hellip;</div>;
  if (status === 'error') return <div className="rx-history-empty">Could not load reports: {error}</div>;
  if (reports.length === 0) return <div className="rx-history-empty">No reports yet. Run some probes and they'll show up here.</div>;

  return reports.map((r) => {
    const vulnerable = r.vulnerabilities > 0;
    return (
      <a key={r.report_id} className="rx-report-item" href={reportUrl(r.report_id)} target="_blank" rel="noopener">
        <span className="rx-report-item-head">
          <span className="rx-report-item-title">{r.target || 'Untitled target'}</span>
          <StatusPill status={vulnerable ? 'vulnerable' : 'defended'} />
        </span>
        <span className="rx-report-risk" aria-label={`Risk score ${r.risk_score} of 100`}>
          <span className="rx-report-risk-track">
            <span className={`rx-report-risk-fill${vulnerable ? '' : ' rx-report-risk-fill-ok'}`} style={{ width: `${Math.max(0, Math.min(100, r.risk_score))}%` }} />
          </span>
          <span className="rx-report-risk-num">{r.risk_score}</span>
        </span>
        <span className="rx-history-item-meta">
          {r.vulnerabilities}/{r.probes_run} vulnerable &middot; {formatWhen(r.started_at)}
        </span>
      </a>
    );
  });
}
