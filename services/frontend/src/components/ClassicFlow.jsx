import { useState } from 'react';
import { marked } from 'marked';
import Button from './Button.jsx';
import StatusPill from './StatusPill.jsx';
import SeverityBadge from './SeverityBadge.jsx';
import TextField from './TextField.jsx';
import TextAreaField from './TextAreaField.jsx';
import SelectField from './SelectField.jsx';
import CheckboxGroup from './CheckboxGroup.jsx';
import { stripThinking } from '../lib/text.js';
import { openReportInNewTab } from '../lib/report.js';
import { CORE_URL, REPORTS_URL } from '../lib/config.js';

// High-level catalog, not an extensive one — a real target is often more
// than one of these at once (an agent that's also RAG-backed and voice
// driven), so this is a checklist, not a single pick.
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

// The original form-based flow: pick a target type, get a plan, fill in the
// target's HTTP contract, run it, read findings. Kept alongside the chat
// view for whoever wants to drive each step by hand.
export default function ClassicFlow() {
  const [targetTypes, setTargetTypes] = useState(['Customer support chatbot']);
  const [targetDescription, setTargetDescription] = useState(
    'A support chatbot with order-lookup and refund-processing tools, backed by a RAG knowledge base of policy documents.'
  );
  const [planStatus, setPlanStatus] = useState('idle'); // idle | running | done | error
  const [plan, setPlan] = useState('');
  const [planError, setPlanError] = useState('');

  const [probeOptions, setProbeOptions] = useState([]); // [{id, name}]
  const [selectedProbeIds, setSelectedProbeIds] = useState([]);
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

  function runPlan(ev) {
    ev.preventDefault();
    if (targetTypes.length === 0) return;
    setPlanStatus('running');
    setPlanError('');
    setPlan('');
    fetch(`${CORE_URL}/api/run.bxm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: targetTypes.join(', '), targetDescription })
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
        setSelectedProbeIds(options.map((o) => o.id));
        setPlanStatus('done');
      })
      .catch((err) => {
        setPlanError(err.message || String(err));
        setPlanStatus('error');
      });
  }

  function runExecute(ev) {
    ev.preventDefault();
    if (selectedProbeIds.length === 0) {
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
        target: targetTypes.join(', '),
        probeIds: selectedProbeIds,
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
    openReportInNewTab(report, REPORTS_URL)
      .then(() => setReportStatus('idle'))
      .catch((err) => {
        setReportError(err.message || String(err));
        setReportStatus('error');
      });
  }

  const probeCheckOptions = probeOptions.map((o) => ({ value: o.id, label: o.id, description: o.name || undefined }));

  return (
    <div className="rx-page">
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
        <CheckboxGroup
          label="Target type"
          required
          hint="Pick everything that applies — a target can be more than one of these at once (e.g. an agent that's also RAG-backed)."
          options={TARGET_TYPES.map((t) => ({ value: t, label: t }))}
          value={targetTypes}
          onChange={setTargetTypes}
        />
        <TextAreaField
          id="f-desc"
          label="Target description"
          value={targetDescription}
          onChange={(e) => setTargetDescription(e.target.value)}
          placeholder="What it does, what tools or data it can access, how a user talks to it."
        />
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

          <CheckboxGroup
            label="Probes to run"
            hint="Pulled from the plan above."
            selectAll
            scroll
            options={probeCheckOptions}
            value={selectedProbeIds}
            onChange={setSelectedProbeIds}
          />

          <div className="rx-form-row">
            <TextField
              id="f-url"
              label="Target AI URL (the one being tested)"
              required
              value={adapterUrl}
              onChange={(e) => setAdapterUrl(e.target.value)}
              placeholder="https://your-n8n-host/webhook/abc123"
            />
            <SelectField id="f-method" label="Method" value={adapterMethod} onChange={(e) => setAdapterMethod(e.target.value)}>
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
            </SelectField>
          </div>

          <TextAreaField
            id="f-headers"
            label="Headers (JSON)"
            mono
            value={adapterHeaders}
            onChange={(e) => setAdapterHeaders(e.target.value)}
            spellCheck={false}
          />

          <TextAreaField
            id="f-body"
            label={<>Body template (JSON &mdash; use {'{{PROMPT}}'} where the attack goes)</>}
            mono
            value={adapterBody}
            onChange={(e) => setAdapterBody(e.target.value)}
            spellCheck={false}
          />

          <TextField
            id="f-resp-path"
            label="Response path"
            mono
            value={adapterResponsePath}
            onChange={(e) => setAdapterResponsePath(e.target.value)}
            placeholder="0.output"
            hint={
              <>
                Dot-path into the target&rsquo;s JSON reply, 0-indexed for arrays &mdash; e.g. <code>0.output</code>{' '}
                for an n8n webhook replying <code>[{'{'}"output": "..."{'}'}]</code>. Leave blank to use the raw
                response body as text.
              </>
            }
          />

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
    </div>
  );
}
