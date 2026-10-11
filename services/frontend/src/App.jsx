import { useState } from 'react';
import { marked } from 'marked';
import Button from './components/Button.jsx';
import StatusPill from './components/StatusPill.jsx';
import SeverityBadge from './components/SeverityBadge.jsx';

// Core/reports addresses are deploy-time config, not something a user should
// be able to repoint from the browser — baked in at build time via Vite env
// vars (see services/frontend/Dockerfile and docker-compose.yml), falling
// back to the local dev stack's default ports.
const CORE_URL = (import.meta.env.VITE_CORE_URL || 'http://localhost:8081').replace(/\/+$/, '');
const REPORTS_URL = (import.meta.env.VITE_REPORTS_URL || 'http://localhost:8082').replace(/\/+$/, '');

const TARGET_TYPES = [
  'Customer support chatbot',
  'Coding agent',
  'RAG / knowledge assistant',
  'Autonomous task agent',
  'Voice assistant',
  'Multi-agent orchestrator'
];
const DEFAULT_BODY_TEMPLATE = '{\n  "mensaje": "{{PROMPT}}",\n  "sessionId": "rexor-test"\n}';
const PROBE_ROW_RE = /^\|\s*\**([A-Z]+(?:-[A-Z]+)*-\d{3})\**\s*\|\s*([^|]+?)\s*\|/gm;
const PROBE_ID_RE = /\b[A-Z]+(?:-[A-Z]+)*-\d{3}\b/g;

function stripThinking(text) {
  return String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

// Pulls { id, name } pairs out of the plan's probe table. The model doesn't
// always lay the table out the same way (sometimes the 2nd column is a
// human name, sometimes it's already the ATLAS technique id) — if what we
// grabbed looks like a technique id rather than a name, drop it and just
// show the bare probe id instead of a misleading label.
function extractProbeOptions(text) {
  const body = String(text || '');
  const seen = new Map();
  for (const m of body.matchAll(PROBE_ROW_RE)) {
    const [, id, col2] = m;
    const name = col2.replace(/\*\*/g, '').trim();
    if (!seen.has(id)) seen.set(id, /^AML\.T\d/.test(name) ? '' : name);
  }
  if (seen.size === 0) {
    for (const id of new Set(body.match(PROBE_ID_RE) || [])) seen.set(id, '');
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

export default function App() {
  const [targetType, setTargetType] = useState('Customer support chatbot');
  const [targetDescription, setTargetDescription] = useState(
    'A support chatbot with order-lookup and refund-processing tools, backed by a RAG knowledge base of policy documents.'
  );
  const [planStatus, setPlanStatus] = useState('idle'); // idle | running | done | error
  const [plan, setPlan] = useState('');
  const [planError, setPlanError] = useState('');

  const [probeOptions, setProbeOptions] = useState([]); // [{id, name}]
  const [selectedProbes, setSelectedProbes] = useState(() => new Set());
  const [adapterUrl, setAdapterUrl] = useState('');
  const [adapterMethod, setAdapterMethod] = useState('POST');
  const [adapterHeaders, setAdapterHeaders] = useState('{}');
  const [adapterBody, setAdapterBody] = useState(DEFAULT_BODY_TEMPLATE);
  const [adapterResponsePath, setAdapterResponsePath] = useState('0.output');

  const [execStatus, setExecStatus] = useState('idle');
  const [findings, setFindings] = useState([]);
  const [execError, setExecError] = useState('');
  const [report, setReport] = useState(null);
  const [reportStatus, setReportStatus] = useState('idle'); // idle | running | error
  const [reportError, setReportError] = useState('');

  function toggleProbe(id) {
    setSelectedProbes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runPlan(ev) {
    ev.preventDefault();
    if (!targetType.trim()) return;
    setPlanStatus('running');
    setPlanError('');
    setPlan('');
    fetch(`${CORE_URL}/api/run.bxm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType, targetDescription })
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
        const cleaned = stripThinking(data.plan);
        const options = extractProbeOptions(cleaned);
        setPlan(cleaned);
        setProbeOptions(options);
        setSelectedProbes(new Set(options.map((o) => o.id)));
        setPlanStatus('done');
      })
      .catch((err) => {
        setPlanError(err.message || String(err));
        setPlanStatus('error');
      });
  }

  function runExecute(ev) {
    ev.preventDefault();
    const probeIds = probeOptions.map((o) => o.id).filter((id) => selectedProbes.has(id));

    if (probeIds.length === 0) {
      setExecError('Select at least one probe.');
      setExecStatus('error');
      return;
    }

    let headers;
    let bodyTemplate;
    try {
      headers = JSON.parse(adapterHeaders || '{}');
      bodyTemplate = JSON.parse(adapterBody);
    } catch (e) {
      setExecError(`Headers and body template must be valid JSON: ${e.message}`);
      setExecStatus('error');
      return;
    }
    if (!adapterUrl.trim()) {
      setExecError('Target URL is required.');
      setExecStatus('error');
      return;
    }

    setExecStatus('running');
    setExecError('');
    setFindings([]);
    setReport(null);
    setReportStatus('idle');
    setReportError('');

    fetch(`${CORE_URL}/api/execute.bxm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: targetType,
        probeIds,
        targetAdapter: {
          url: adapterUrl,
          method: adapterMethod,
          headers,
          bodyTemplate,
          responsePath: adapterResponsePath
        }
      })
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
        setFindings(data.findings || []);
        setReport(data.report || null);
        setExecStatus('done');
      })
      .catch((err) => {
        setExecError(err.message || String(err));
        setExecStatus('error');
      });
  }

  function openReport(ev) {
    ev.preventDefault();
    if (!report) return;
    setReportStatus('running');
    setReportError('');

    // Open the tab synchronously, inside the click handler, so browsers
    // (Brave/Chrome/Safari) don't treat it as an unsolicited popup — if we
    // open it after the fetch resolves, it's no longer tied to the user
    // gesture and gets silently blocked.
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write('<p style="font:14px sans-serif;padding:2rem">Building report&hellip;</p>');
    }

    fetch(`${REPORTS_URL}/report.bxm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        if (reportWindow) {
          reportWindow.document.open();
          reportWindow.document.write(html);
          reportWindow.document.close();
        } else {
          // Popup blocked even for the synchronous open (some strict
          // settings do this) — fall back to a download-free same-tab view.
          const blob = new Blob([html], { type: 'text/html' });
          window.location.href = URL.createObjectURL(blob);
        }
        setReportStatus('idle');
      })
      .catch((err) => {
        if (reportWindow) reportWindow.close();
        setReportError(err.message || String(err));
        setReportStatus('error');
      });
  }

  return (
    <>
      <div className="topbar">
        <img className="logo-light" src="/rexor-logo.svg" alt="Rexor" />
        <img className="logo-dark" src="/rexor-logo-dark.svg" alt="Rexor" />
        <span className="topbar-tag">RED TEAM CONSOLE</span>
      </div>

      <div>
        <div className="eyebrow">New assessment</div>
        <h1 className="page-title">Evaluate a target AI</h1>
        <p className="lede">
          Describe the model or agent you want to test. Rexor consults the ATLAS attack catalog and picks a probe
          plan for it, then delivers the probes to your target and scores what comes back.
        </p>
      </div>

      <form className="card" onSubmit={runPlan}>
        <h2>1. Pick a strategy</h2>
        <div className="field">
          <label htmlFor="f-type">Target type</label>
          <select id="f-type" className="select" required value={targetType} onChange={(e) => setTargetType(e.target.value)}>
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-desc">Target description</label>
          <textarea
            id="f-desc"
            className="textarea"
            value={targetDescription}
            onChange={(e) => setTargetDescription(e.target.value)}
            placeholder="What it does, what tools or data it can access, how a user talks to it."
          />
        </div>
        <div className="row-end">
          {planStatus === 'running' ? <StatusPill status="running">Analyzing target&hellip;</StatusPill> : <span />}
          <Button type="submit" variant="primary" disabled={planStatus === 'running'}>
            Launch attack
          </Button>
        </div>
      </form>

      {planStatus === 'error' ? (
        <div className="error">
          <div>
            <b>Could not reach core. </b>
            {planError}
          </div>
          <div>Check that core and atlas-redteam are running and the endpoint above is correct.</div>
        </div>
      ) : null}

      {planStatus === 'done' ? (
        <div className="result-card">
          <div className="result-head">
            <h2>Test plan</h2>
            <StatusPill status="vulnerable">Plan ready</StatusPill>
          </div>
          <div className="result-body" dangerouslySetInnerHTML={{ __html: marked.parse(plan) }} />
        </div>
      ) : null}

      {planStatus === 'done' ? (
        <form className="card" onSubmit={runExecute}>
          <h2>2. Run it against your target</h2>
          <p className="section-hint">
            Every target speaks its own HTTP dialect. Describe yours once &mdash; a REST endpoint, an n8n webhook,
            anything that takes JSON and replies with JSON.
          </p>

          <div className="field">
            <div className="field-head">
              <label>Probes to run</label>
              <div className="probe-select-actions">
                <button type="button" className="link-btn" onClick={() => setSelectedProbes(new Set(probeOptions.map((o) => o.id)))}>
                  Select all
                </button>
                <button type="button" className="link-btn" onClick={() => setSelectedProbes(new Set())}>
                  Select none
                </button>
              </div>
            </div>
            <div className="probe-checklist">
              {probeOptions.map((o) => (
                <label key={o.id} className="probe-check">
                  <input type="checkbox" checked={selectedProbes.has(o.id)} onChange={() => toggleProbe(o.id)} />
                  <code className="mono">{o.id}</code>
                  {o.name ? <span className="probe-name">{o.name}</span> : null}
                </label>
              ))}
            </div>
            <div className="hint">
              Pulled from the plan above &mdash; {selectedProbes.size} / {probeOptions.length} selected.
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="f-url">Target AI URL (the one being tested)</label>
              <input
                id="f-url"
                className="input"
                required
                value={adapterUrl}
                onChange={(e) => setAdapterUrl(e.target.value)}
                placeholder="https://your-n8n-host/webhook/abc123"
              />
            </div>
            <div className="field">
              <label htmlFor="f-method">Method</label>
              <select id="f-method" className="select" value={adapterMethod} onChange={(e) => setAdapterMethod(e.target.value)}>
                <option>POST</option>
                <option>PUT</option>
                <option>PATCH</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="f-headers">Headers (JSON)</label>
            <textarea
              id="f-headers"
              className="textarea mono"
              value={adapterHeaders}
              onChange={(e) => setAdapterHeaders(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="field">
            <label htmlFor="f-body">Body template (JSON &mdash; use {'{{PROMPT}}'} where the attack goes)</label>
            <textarea
              id="f-body"
              className="textarea mono"
              value={adapterBody}
              onChange={(e) => setAdapterBody(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="field">
            <label htmlFor="f-resp-path">Response path</label>
            <input
              id="f-resp-path"
              className="input mono"
              value={adapterResponsePath}
              onChange={(e) => setAdapterResponsePath(e.target.value)}
              placeholder="0.output"
            />
            <div className="hint">
              Dot-path into the target&rsquo;s JSON reply, 0-indexed for arrays &mdash; e.g. <code>0.output</code> for
              an n8n webhook replying <code>[{'{'}"output": "..."{'}'}]</code>. Leave blank to use the raw response
              body as text.
            </div>
          </div>

          <div className="row-end">
            {execStatus === 'running' ? <StatusPill status="running">Running probes&hellip;</StatusPill> : <span />}
            <Button type="submit" variant="primary" disabled={execStatus === 'running'}>
              Run attacks on target
            </Button>
          </div>
        </form>
      ) : null}

      {execStatus === 'error' ? (
        <div className="error">
          <b>Could not run the attacks. </b>
          {execError}
        </div>
      ) : null}

      {execStatus === 'done' ? (
        <div className="result-card">
          <div className="result-head">
            <h2>Findings</h2>
            <span className="topbar-tag">
              {findings.filter((f) => f.vulnerable).length} / {findings.length} vulnerable
            </span>
          </div>

          {report ? (
            <div className="row-end">
              <span />
              <Button variant="primary" onClick={openReport} disabled={reportStatus === 'running'}>
                {reportStatus === 'running' ? 'Building report…' : 'Generate report'}
              </Button>
            </div>
          ) : null}
          {reportStatus === 'error' ? (
            <div className="error">
              <b>Could not build the report. </b>
              {reportError}
            </div>
          ) : null}

          {findings.map((f, i) => (
            <div className="finding" key={f.probe_id || i}>
              <div className="finding-head">
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  {f.severity ? <SeverityBadge severity={f.severity} /> : null}
                  {f.error ? null : <StatusPill status={f.vulnerable ? 'vulnerable' : 'defended'} />}
                </div>
                <code className="finding-id">{f.probe_id || f.probeId}</code>
              </div>
              {f.error ? (
                <div className="finding-rationale">Error: {f.error}</div>
              ) : (
                <>
                  <div className="finding-meta">{f.atlas_technique} &middot; {f.atlas_technique_name}</div>
                  <div className="finding-rationale">{f.rationale}</div>
                  {f.targetResponse ? <div className="finding-turn">{f.targetResponse}</div> : null}
                </>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <footer className="note">
        Attack type reference: MITRE ATLAS, via the <code>atlas-redteam</code> MCP server.
      </footer>
    </>
  );
}
