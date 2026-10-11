import { useState } from 'react';
import { marked } from 'marked';
import Button from './components/Button.jsx';
import StatusPill from './components/StatusPill.jsx';
import SeverityBadge from './components/SeverityBadge.jsx';

const DEFAULT_CORE_URL = 'http://localhost:8081';
const TARGET_TYPES = ['Customer support chatbot', 'Coding agent', 'RAG assistant', 'Autonomous task agent', 'Voice assistant'];
const DEFAULT_BODY_TEMPLATE = '{\n  "mensaje": "{{PROMPT}}",\n  "sessionId": "rexor-test"\n}';
const PROBE_ID_RE = /\b[A-Z]+(?:-[A-Z]+)*-\d{3}\b/g;

function readStored(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore: private browsing / blocked storage
  }
}

function stripThinking(text) {
  return String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function extractProbeIds(text) {
  const matches = String(text || '').match(PROBE_ID_RE) || [];
  return [...new Set(matches)].join(', ');
}

export default function App() {
  const [coreUrl, setCoreUrl] = useState(() => readStored('rexor-core-url', DEFAULT_CORE_URL));

  const [targetType, setTargetType] = useState('Customer support chatbot');
  const [targetDescription, setTargetDescription] = useState(
    'A support chatbot with order-lookup and refund-processing tools, backed by a RAG knowledge base of policy documents.'
  );
  const [planStatus, setPlanStatus] = useState('idle'); // idle | running | done | error
  const [plan, setPlan] = useState('');
  const [planError, setPlanError] = useState('');

  const [probeIdsText, setProbeIdsText] = useState('');
  const [adapterUrl, setAdapterUrl] = useState('');
  const [adapterMethod, setAdapterMethod] = useState('POST');
  const [adapterHeaders, setAdapterHeaders] = useState('{}');
  const [adapterBody, setAdapterBody] = useState(DEFAULT_BODY_TEMPLATE);
  const [adapterResponsePath, setAdapterResponsePath] = useState('0.output');

  const [execStatus, setExecStatus] = useState('idle');
  const [findings, setFindings] = useState([]);
  const [execError, setExecError] = useState('');

  function onCoreUrlChange(v) {
    setCoreUrl(v);
    writeStored('rexor-core-url', v);
  }

  function base() {
    return coreUrl.replace(/\/+$/, '');
  }

  function runPlan(ev) {
    ev.preventDefault();
    if (!targetType.trim()) return;
    setPlanStatus('running');
    setPlanError('');
    setPlan('');
    fetch(`${base()}/api/run.bxm`, {
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
        setPlan(cleaned);
        setProbeIdsText(extractProbeIds(cleaned));
        setPlanStatus('done');
      })
      .catch((err) => {
        setPlanError(err.message || String(err));
        setPlanStatus('error');
      });
  }

  function runExecute(ev) {
    ev.preventDefault();
    const probeIds = probeIdsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (probeIds.length === 0) {
      setExecError('Add at least one probe id (comma-separated).');
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

    fetch(`${base()}/api/execute.bxm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
        setExecStatus('done');
      })
      .catch((err) => {
        setExecError(err.message || String(err));
        setExecStatus('error');
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
          <input
            id="f-type"
            className="input"
            list="f-type-options"
            required
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
          />
          <datalist id="f-type-options">
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
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
        <details className="advanced">
          <summary>Core endpoint</summary>
          <div className="field">
            <label htmlFor="f-core-url">core service URL</label>
            <input id="f-core-url" className="input" value={coreUrl} onChange={(e) => onCoreUrlChange(e.target.value)} />
            <div className="hint">
              Rexor&rsquo;s core service, running locally via <code>scripts/compose.sh up --build core atlas-redteam</code>.
            </div>
          </div>
        </details>
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
            <label htmlFor="f-probes">Probe IDs to run</label>
            <input
              id="f-probes"
              className="input mono"
              value={probeIdsText}
              onChange={(e) => setProbeIdsText(e.target.value)}
              placeholder="PI-DIRECT-001, ACT-001"
            />
            <div className="hint">Pre-filled from the plan above &mdash; edit freely.</div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="f-url">Target URL</label>
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
