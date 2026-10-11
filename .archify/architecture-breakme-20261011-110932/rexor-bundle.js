/* @ds-bundle: {"format":4,"namespace":"Rexor","components":[{"name":"Button"},{"name":"SeverityBadge"},{"name":"StatusPill"},{"name":"FindingCard"},{"name":"ReportCover"},{"name":"ReportPage"},{"name":"RiskSummary"},{"name":"SeverityBar"},{"name":"RiskMatrix"},{"name":"CoverageTable"},{"name":"FindingDetail"},{"name":"RemediationPlan"},{"name":"TextField"},{"name":"TextArea"},{"name":"Select"},{"name":"Checkbox"},{"name":"RadioGroup"},{"name":"Switch"},{"name":"NumberField"},{"name":"PasswordField"},{"name":"SearchField"},{"name":"DateField"},{"name":"CheckboxGroup"},{"name":"SegmentedControl"},{"name":"Slider"},{"name":"TagInput"},{"name":"FileUpload"},{"name":"Badge"},{"name":"StatusDot"},{"name":"IconButton"},{"name":"ToggleButton"},{"name":"ThemeToggle"},{"name":"DropdownMenu"},{"name":"ZoomControl"},{"name":"CanvasToolbar"},{"name":"ArchNode"},{"name":"ArchDiagram"},{"name":"ConsoleHeader"},{"name":"DotBackground"},{"name":"ChatComposer"},{"name":"PromptSuggestions"},{"name":"ChatMessage"},{"name":"TypingIndicator"},{"name":"QuickReplies"},{"name":"AttackPlan"},{"name":"AppShell"},{"name":"PageHeader"},{"name":"Tabs"},{"name":"StatCard"},{"name":"DataTable"},{"name":"ScrollArea"},{"name":"Icon"}]} */
(function(){
  var R = window.React, h = R.createElement;
  function cx(){ return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  var SEV = { critical:'Critical', high:'High', medium:'Medium', low:'Low', info:'Info' };
  var STATUS = { vulnerable:'Vulnerable', defended:'Defended', running:'Running', queued:'Queued' };

  function Button(p){
    var variant = p.variant || 'secondary', size = p.size || 'md';
    var rest = {}; for (var k in p) if (k!=='variant'&&k!=='size'&&k!=='className'&&k!=='children') rest[k]=p[k];
    rest.className = cx('rx-btn','rx-btn-'+variant,'rx-btn-'+size,p.className);
    if (!rest.type) rest.type = 'button';
    return h('button', rest, p.children);
  }
  function SeverityBadge(p){
    var s = SEV[p.severity] ? p.severity : 'info';
    return h('span', { className: cx('rx-sev','rx-sev-'+s, p.className) },
      h('span', { className:'rx-sev-dot', 'aria-hidden':'true' }), p.children || SEV[s]);
  }
  function StatusPill(p){
    var s = STATUS[p.status] ? p.status : 'queued';
    return h('span', { className: cx('rx-pill','rx-pill-'+s, p.className) },
      h('span', { className:'rx-pill-dot', 'aria-hidden':'true' }), p.children || STATUS[s]);
  }
  function FindingCard(p){
    var head = h('div', { className:'rx-fc-head' },
      h('div', { className:'rx-fc-badges' },
        h(SeverityBadge, { severity:p.severity || 'info' }),
        p.status ? h(StatusPill, { status:p.status }) : null),
      p.id ? h('code', { className:'rx-fc-id' }, p.id) : null);
    var body = [];
    if (p.vector) body.push(h('div', { key:'v', className:'rx-fc-vector' }, p.vector));
    body.push(h('h3', { key:'t', className:'rx-fc-title' }, p.title));
    if (p.prompt) body.push(h('div', { key:'p', className:'rx-fc-turn' }, h('div',{className:'rx-fc-role'},'Attack prompt'), h('pre',{className:'rx-fc-code'}, p.prompt)));
    if (p.response) body.push(h('div', { key:'r', className:'rx-fc-turn rx-fc-turn-model' }, h('div',{className:'rx-fc-role'},'Model response'), h('pre',{className:'rx-fc-code'}, p.response)));
    if (p.meta) body.push(h('div', { key:'m', className:'rx-fc-meta' }, p.meta));
    if (p.actions) body.push(h('div', { key:'a', className:'rx-fc-actions' }, p.actions));
    return h('article', { className: cx('rx-fc', p.className) }, head, body);
  }
  window.Rexor = Object.assign(window.Rexor || {}, { Button:Button, SeverityBadge:SeverityBadge, StatusPill:StatusPill, FindingCard:FindingCard });
})();

(function(){
  var R = window.React, h = R.createElement, X = window.Rexor;
  var MARK_WHITE = '/_blob/94478250510d5eec940b5231ff5ae367', LOGO = '/_blob/8ef6875a76952f8394e8e31c1d0ae00c', LOGO_DARK = '/_blob/cba9cf9d8f757c2840b1cf47a371b2da';
  var ORDER = ['critical','high','medium','low','info'];
  var LABEL = { critical:'Critical', high:'High', medium:'Medium', low:'Low', info:'Info' };
  function cx(){ return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function k(o, key){ var r = {}; for (var p in o) r[p] = o[p]; r.key = key; return r; }

  function ReportCover(p){
    var meta = [['Target', p.target], ['Client', p.client], ['Assessment window', p.period], ['Report ID', p.reportId], ['Version', p.version], ['Prepared by', p.preparedBy]].filter(function(m){ return m[1]; });
    return h('section', { className:'rx-r-page rx-r-cover' },
      h('div', { className:'rx-r-cover-band' },
        h('img', { className:'rx-r-cover-mark', src:p.markSrc || MARK_WHITE, alt:'Rexor' }),
        h('svg', { className:'rx-r-cover-visors', viewBox:'0 0 240 152', 'aria-hidden':'true' },
          [0,1,2,3].map(function(i){ return h('g', { key:i },
            h('rect', { x:0, y:i*40, width:240, height:24, rx:12, className:'rx-r-visor' }),
            h('circle', { cx:24 + i*64, cy:i*40 + 12, r:7, className:'rx-r-eye' })); })),
        h('div', { className:'rx-r-classif rx-r-classif-onband' }, p.classification || 'CONFIDENTIAL')),
      h('div', { className:'rx-r-cover-body' },
        h('div', { className:'rx-r-eyebrow' }, p.eyebrow || 'AI Red Team Assessment'),
        h('h1', { className:'rx-r-cover-title' }, p.title),
        p.subtitle ? h('p', { className:'rx-r-cover-sub' }, p.subtitle) : null,
        h('dl', { className:'rx-r-cover-meta' }, meta.map(function(m){ return h('div', { key:m[0] }, h('dt', null, m[0]), h('dd', null, m[1])); }))),
      h('div', { className:'rx-r-cover-foot' },
        h('img', { src:p.logoSrc || LOGO, alt:'Rexor', className:'rx-r-cover-logo rx-r-logo-light' }),
        h('img', { src:p.logoDarkSrc || LOGO_DARK, alt:'', className:'rx-r-cover-logo rx-r-logo-dark' }),
        h('span', null, 'This report contains sensitive security information. Distribution limited to the named recipients.')));
  }

  function ReportPage(p){
    return h('section', { className:cx('rx-r-page', p.className) },
      h('header', { className:'rx-r-head' },
        h('span', { className:'rx-r-head-title' }, p.title),
        h('span', { className:'rx-r-classif' }, p.classification || 'CONFIDENTIAL')),
      h('div', { className:'rx-r-body' }, p.children),
      h('footer', { className:'rx-r-foot' },
        h('span', null, [p.client, p.date].filter(Boolean).join(' · ')),
        h('span', null, p.page ? ('Page ' + p.page + (p.pages ? ' of ' + p.pages : '')) : null)));
  }

  function SeverityBar(p){
    var c = p.counts || {}, total = ORDER.reduce(function(a, s){ return a + (c[s] || 0); }, 0) || 1;
    return h('div', { className:'rx-r-sevbar-wrap' },
      h('div', { className:'rx-r-sevbar', role:'img', 'aria-label':ORDER.map(function(s){ return LABEL[s] + ' ' + (c[s] || 0); }).join(', ') },
        ORDER.filter(function(s){ return c[s]; }).map(function(s){
          return h('span', { key:s, className:'rx-r-seg rx-r-seg-' + s, style:{ flexGrow:c[s] }, title:LABEL[s] + ': ' + c[s] + ' (' + Math.round(c[s] / total * 100) + '%)' }); })),
      h('ul', { className:'rx-r-legend' }, ORDER.map(function(s){
        return h('li', { key:s }, h('i', { className:'rx-r-sw rx-r-seg-' + s }), h('span', null, LABEL[s]), h('b', null, c[s] || 0)); })));
  }

  function RiskSummary(p){
    var c = p.counts || {}, total = ORDER.reduce(function(a, s){ return a + (c[s] || 0); }, 0);
    var rating = p.rating || 'high';
    return h('div', { className:'rx-r-summary' },
      h('div', { className:'rx-r-kpis' },
        h('div', { className:'rx-r-kpi rx-r-kpi-rating rx-r-rate-' + rating },
          h('div', { className:'rx-r-kpi-label' }, 'Overall risk'),
          h('div', { className:'rx-r-kpi-value' }, LABEL[rating]),
          p.score != null ? h('div', { className:'rx-r-kpi-sub' }, p.score + ' / 10') : null),
        h('div', { className:'rx-r-kpi' },
          h('div', { className:'rx-r-kpi-label' }, 'Attack success rate'),
          h('div', { className:'rx-r-kpi-value rx-r-num' }, p.asr != null ? p.asr + '%' : '—'),
          p.attacks ? h('div', { className:'rx-r-kpi-sub' }, p.attacks + ' attacks executed') : null),
        h('div', { className:'rx-r-kpi' },
          h('div', { className:'rx-r-kpi-label' }, 'Findings'),
          h('div', { className:'rx-r-kpi-value rx-r-num' }, total),
          h('div', { className:'rx-r-kpi-sub' }, (c.critical || 0) + ' critical · ' + (c.high || 0) + ' high'))),
      h('figure', { className:'rx-r-fig' },
        h(SeverityBar, { counts:c }),
        h('figcaption', { className:'rx-r-caption' }, p.caption || 'Findings by severity')));
  }

  function bucket(l, i){ var s = l * i; return s >= 20 ? 'critical' : s >= 12 ? 'high' : s >= 6 ? 'medium' : s >= 3 ? 'low' : 'info'; }
  function RiskMatrix(p){
    var map = {}; (p.cells || []).forEach(function(c){ map[c.likelihood + '-' + c.impact] = c.count; });
    var lv = ['Rare','Unlikely','Possible','Likely','Almost certain'], iv = ['Minimal','Minor','Moderate','Major','Severe'];
    var rows = [];
    for (var i = 5; i >= 1; i--) {
      rows.push(h('div', { key:'l' + i, className:'rx-r-mx-ylab' }, iv[i - 1]));
      for (var l = 1; l <= 5; l++) {
        var n = map[l + '-' + i], b = bucket(l, i);
        rows.push(h('div', { key:l + '-' + i, className:'rx-r-mx-cell rx-sev-' + b, title:'Likelihood ' + lv[l - 1] + ' × Impact ' + iv[i - 1] + ' — ' + LABEL[b] + (n ? ': ' + n + ' finding' + (n > 1 ? 's' : '') : '') }, n ? h('b', null, n) : null));
      }
    }
    rows.push(h('div', { key:'corner' }));
    lv.forEach(function(t, j){ rows.push(h('div', { key:'x' + j, className:'rx-r-mx-xlab' }, t)); });
    return h('figure', { className:'rx-r-fig rx-r-mx' },
      h('div', { className:'rx-r-mx-wrap' },
        h('div', { className:'rx-r-mx-axis-y' }, 'Impact'),
        h('div', null, h('div', { className:'rx-r-mx-grid' }, rows), h('div', { className:'rx-r-mx-axis-x' }, 'Likelihood'))),
      h('figcaption', { className:'rx-r-caption' }, p.caption || 'Risk matrix — findings by likelihood and impact'));
  }

  function CoverageTable(p){
    return h('table', { className:'rx-r-table' },
      h('thead', null, h('tr', null, ['ID','Category','Tests','Succeeded','Attack success rate','Result'].map(function(t, i){ return h('th', { key:t, className:i >= 2 && i <= 3 ? 'rx-r-num' : null }, t); }))),
      h('tbody', null, (p.rows || []).map(function(r){
        var asr = r.tests ? Math.round(r.succeeded / r.tests * 1000) / 10 : 0;
        return h('tr', { key:r.id },
          h('td', null, h('code', null, r.id)),
          h('td', null, r.category),
          h('td', { className:'rx-r-num' }, r.tests),
          h('td', { className:'rx-r-num' }, r.succeeded),
          h('td', null, h('div', { className:'rx-r-asr', title:asr + '%' }, h('span', { className:'rx-r-asr-track' }, h('span', { className:'rx-r-asr-fill', style:{ width:Math.max(asr, asr ? 2 : 0) + '%' } })), h('span', { className:'rx-r-num' }, asr + '%'))),
          h('td', null, h(X.StatusPill, { status:r.succeeded ? 'vulnerable' : 'defended' })));
      })));
  }

  function FindingDetail(p){
    var meta = [['OWASP LLM', p.owasp], ['MITRE ATLAS', p.atlas], ['Target', p.target], ['Reproducibility', p.repro], ['Status', p.status]].filter(function(m){ return m[1]; });
    function sec(t, body, key){ return body ? h('div', { key:key, className:'rx-r-fd-sec' }, h('h4', null, t), body) : null; }
    return h('article', { className:'rx-r-fd' },
      h('div', { className:'rx-r-fd-head' },
        h('div', { className:'rx-r-fd-badges' }, h(X.SeverityBadge, { severity:p.severity }, LABEL[p.severity] + (p.score != null ? ' · ' + p.score : '')), h('code', { className:'rx-r-fd-id' }, p.id)),
        h('h3', { className:'rx-r-fd-title' }, p.title)),
      h('dl', { className:'rx-r-fd-meta' }, meta.map(function(m){ return h('div', { key:m[0] }, h('dt', null, m[0]), h('dd', null, m[1])); })),
      sec('Description', p.description && h('p', null, p.description), 'd'),
      sec('Evidence', p.evidence && h('div', { className:'rx-r-ev' }, p.evidence.map(function(t, i){
        return h('div', { key:i, className:'rx-r-ev-turn rx-r-ev-' + t.role }, h('div', { className:'rx-r-ev-role' }, t.role === 'attacker' ? 'Rexor · attack' : t.role === 'model' ? 'Target · response' : t.role), h('pre', null, t.text)); })), 'e'),
      sec('Impact', p.impact && h('p', null, p.impact), 'i'),
      sec('Remediation', p.remediation && h('ol', null, p.remediation.map(function(r, i){ return h('li', { key:i }, r); })), 'r'),
      sec('References', p.references && h('ul', { className:'rx-r-refs' }, p.references.map(function(r, i){ return h('li', { key:i }, r); })), 'f'));
  }

  function RemediationPlan(p){
    return h('table', { className:'rx-r-table' },
      h('thead', null, h('tr', null, ['Priority','Finding','Action','Owner','Effort','Due'].map(function(t){ return h('th', { key:t }, t); }))),
      h('tbody', null, (p.rows || []).map(function(r, i){
        return h('tr', { key:i },
          h('td', null, h('span', { className:'rx-r-prio rx-r-prio-' + String(r.priority).toLowerCase() }, r.priority)),
          h('td', null, h('code', null, r.finding)),
          h('td', null, r.action), h('td', null, r.owner), h('td', null, r.effort), h('td', { className:'rx-r-num' }, r.due));
      })));
  }

  Object.assign(window.Rexor, { ReportCover:ReportCover, ReportPage:ReportPage, RiskSummary:RiskSummary, SeverityBar:SeverityBar, RiskMatrix:RiskMatrix, CoverageTable:CoverageTable, FindingDetail:FindingDetail, RemediationPlan:RemediationPlan });
})();

(function(){
  var R = window.React, h = R.createElement, X = window.Rexor;
  var MARK = '/_blob/ff7a9f69302056878dfa18e6fb73c8e9';
  function cx(){ return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function omit(p, keys){ var r = {}; for (var k in p) if (keys.indexOf(k) < 0) r[k] = p[k]; return r; }
  var uid = 0; function useId(id){ var r = R.useRef(id || ('rx-f-' + (++uid))); return r.current; }

  /* Icons: 24px grid, 1.75 stroke, currentColor */
  var PATHS = {
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    target: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11v2',
    bot: 'M12 3v3M6 7h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM9 12h.01M15 12h.01M9 16h6',
    shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3zM12 8v5M12 16h.01',
    file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6',
    settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
    bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2zM10 21h4',
    plus: 'M12 5v14M5 12h14',
    chevron: 'M6 9l6 6 6-6',
    alert: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v5M12 16h.01',
    check: 'M5 12l5 5 9-10',
    arrowUp: 'M12 19V5M6 11l6-6 6 6',
    arrowDown: 'M12 5v14M6 13l6 6 6-6',
    menu: 'M4 7h16M4 12h16M4 17h16',
    minus: 'M5 12h14',
    x: 'M6 6l12 12M18 6L6 18',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
    calendar: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4',
    upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0',
    code: 'M8 7l-5 5 5 5M16 7l5 5-5 5',
    window: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 9h18M7 7h.01',
    external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    server: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
    database: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
    expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
    download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
    route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
    focus: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    palette: 'M12 3a9 9 0 0 0 0 18c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.2-4-7.8-9-7.8zM7.5 12h.01M10 8h.01M15 8h.01',
    fit: 'M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M9 20H5a1 1 0 0 1-1-1v-4M15 20h4a1 1 0 0 0 1-1v-4M9 9h6v6H9z',
    paperclip: 'M20 11.5l-8.1 8.1a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8',
    sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z',
    stop: 'M7 7h10v10H7z',
    copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
    refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
    play: 'M7 4l13 8-13 8V4z',
    message: 'M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z',
    key: 'M15 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM10.8 13.2L3 21M6 18l2 2M15 7h.01'
  };
  function Icon(p){
    return h('svg', { className:cx('rx-icon', p.className), width:p.size || 18, height:p.size || 18, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.75, strokeLinecap:'round', strokeLinejoin:'round', 'aria-hidden':p.title ? null : 'true', role:p.title ? 'img' : null },
      p.title ? h('title', null, p.title) : null, h('path', { d:PATHS[p.name] || PATHS.grid }));
  }

  /* ---------- Forms ---------- */
  function Field(p, id, control){
    var hintId = id + '-hint', errId = id + '-err';
    return h('div', { className:cx('rx-field', p.error && 'rx-field-invalid', p.disabled && 'rx-field-disabled', p.className) },
      p.label ? h('label', { className:'rx-label', htmlFor:id }, p.label, p.required ? h('span', { className:'rx-req', 'aria-hidden':'true' }, ' *') : null, p.optional ? h('span', { className:'rx-opt' }, ' (optional)') : null) : null,
      control,
      p.error ? h('div', { className:'rx-error', id:errId }, h(Icon, { name:'alert', size:16 }), h('span', null, p.error))
        : p.hint ? h('div', { className:'rx-hint', id:hintId }, p.hint) : null);
  }
  function aria(p, id){ return { id:id, 'aria-invalid':p.error ? 'true' : null, 'aria-describedby':p.error ? id + '-err' : p.hint ? id + '-hint' : null, required:p.required, disabled:p.disabled }; }
  var FIELD_KEYS = ['label','hint','error','optional','className','icon','mono','options','placeholderOption','prefix','suffix'];

  function TextField(p){
    var id = useId(p.id);
    var input = h('input', Object.assign(omit(p, FIELD_KEYS), aria(p, id), { className:cx('rx-input', p.mono && 'rx-mono'), type:p.type || 'text' }));
    if (p.icon) input = h('div', { className:'rx-input-wrap' }, h(Icon, { name:p.icon, size:16, className:'rx-input-icon' }), input);
    if (p.prefix || p.suffix) input = h('div', { className:'rx-affix' }, p.prefix ? h('span', { className:'rx-affix-pre' }, p.prefix) : null, input, p.suffix ? h('span', { className:'rx-affix-suf' }, p.suffix) : null);
    return Field(p, id, input);
  }
  function TextArea(p){
    var id = useId(p.id);
    return Field(p, id, h('textarea', Object.assign(omit(p, FIELD_KEYS), aria(p, id), { className:cx('rx-input rx-textarea', p.mono && 'rx-mono'), rows:p.rows || 4 })));
  }
  function Select(p){
    var id = useId(p.id);
    var opts = (p.options || []).map(function(o){ return typeof o === 'string' ? { value:o, label:o } : o; });
    return Field(p, id, h('div', { className:'rx-select-wrap' },
      h('select', Object.assign(omit(p, FIELD_KEYS), aria(p, id), { className:'rx-input rx-select' }),
        p.placeholderOption ? h('option', { value:'', disabled:true }, p.placeholderOption) : null,
        opts.map(function(o){ return h('option', { key:o.value, value:o.value }, o.label); })),
      h(Icon, { name:'chevron', size:16, className:'rx-select-chev' })));
  }
  function Checkbox(p){
    var id = useId(p.id);
    return h('label', { className:cx('rx-check', p.disabled && 'rx-check-disabled', p.className), htmlFor:id },
      h('input', Object.assign(omit(p, ['label','description','className']), { id:id, type:'checkbox', className:'rx-sr' })),
      h('span', { className:'rx-box', 'aria-hidden':'true' }, h(Icon, { name:'check', size:14 })),
      h('span', { className:'rx-check-text' }, h('span', null, p.label), p.description ? h('span', { className:'rx-check-desc' }, p.description) : null));
  }
  function RadioGroup(p){
    var name = useId(p.name);
    return h('fieldset', { className:cx('rx-fieldset', p.className) },
      p.label ? h('legend', { className:'rx-label' }, p.label) : null,
      h('div', { className:cx('rx-radio-list', p.cards && 'rx-radio-cards') }, (p.options || []).map(function(o){
        var id = name + '-' + o.value;
        return h('label', { key:o.value, className:'rx-check rx-radio', htmlFor:id },
          h('input', { id:id, type:'radio', name:name, value:o.value, className:'rx-sr', defaultChecked:p.defaultValue === o.value, checked:p.value != null ? p.value === o.value : undefined, onChange:p.onChange ? function(){ p.onChange(o.value); } : undefined, disabled:o.disabled }),
          h('span', { className:'rx-box rx-dot', 'aria-hidden':'true' }),
          h('span', { className:'rx-check-text' }, h('span', null, o.label), o.description ? h('span', { className:'rx-check-desc' }, o.description) : null));
      })));
  }
  function Switch(p){
    var id = useId(p.id);
    return h('label', { className:cx('rx-switch', p.className), htmlFor:id },
      h('input', Object.assign(omit(p, ['label','description','className']), { id:id, type:'checkbox', role:'switch', className:'rx-sr' })),
      h('span', { className:'rx-switch-track', 'aria-hidden':'true' }, h('span', { className:'rx-switch-thumb' })),
      h('span', { className:'rx-check-text' }, h('span', null, p.label), p.description ? h('span', { className:'rx-check-desc' }, p.description) : null));
  }

  /* ---------- Web layout ---------- */
  function AppShell(p){
    var open = R.useState(false), isOpen = open[0], setOpen = open[1];
    return h('div', { className:cx('rx-shell', isOpen && 'rx-shell-open', p.className) },
      h('aside', { className:'rx-side' },
        h('div', { className:'rx-side-brand' }, h('img', { src:p.markSrc || MARK, alt:'', width:28, height:28 }), h('span', { className:'rx-side-name' }, 'Rexor'), p.workspace ? h('span', { className:'rx-side-ws' }, p.workspace) : null),
        h('nav', { className:'rx-nav rx-scroll', 'aria-label':'Main' }, (p.nav || []).map(function(n, i){
          if (n.section) return h('div', { key:i, className:'rx-nav-section' }, n.section);
          return h('a', { key:i, href:n.href || '#', className:cx('rx-nav-item', n.active && 'rx-nav-active'), 'aria-current':n.active ? 'page' : null },
            h(Icon, { name:n.icon || 'grid', size:18 }), h('span', { className:'rx-nav-label' }, n.label), n.count != null ? h('span', { className:'rx-nav-count' }, n.count) : null);
        })),
        p.sideFooter ? h('div', { className:'rx-side-foot' }, p.sideFooter) : null),
      h('div', { className:'rx-scrim', onClick:function(){ setOpen(false); } }),
      h('div', { className:'rx-main' },
        h('header', { className:'rx-top' },
          h('button', { className:'rx-btn rx-btn-ghost rx-btn-md rx-menu-btn', type:'button', 'aria-label':'Open navigation', onClick:function(){ setOpen(!isOpen); } }, h(Icon, { name:'menu' })),
          h('div', { className:'rx-top-crumbs' }, p.breadcrumb),
          h('div', { className:'rx-top-search' }, h(Icon, { name:'search', size:16 }), h('input', { className:'rx-top-search-input', placeholder:p.searchPlaceholder || 'Search campaigns, findings…', 'aria-label':'Search' }), h('kbd', null, '/')),
          h('div', { className:'rx-top-actions' }, p.actions, p.user ? h('span', { className:'rx-avatar', title:p.user }, p.user.split(' ').map(function(w){ return w[0]; }).join('').slice(0, 2).toUpperCase()) : null)),
        h('main', { className:'rx-content rx-scroll' }, h('div', { className:'rx-content-inner' }, p.children))));
  }
  function PageHeader(p){
    return h('div', { className:'rx-ph' },
      h('div', { className:'rx-ph-text' },
        p.eyebrow ? h('div', { className:'rx-ph-eyebrow' }, p.eyebrow) : null,
        h('h1', { className:'rx-ph-title' }, p.title),
        p.description ? h('p', { className:'rx-ph-desc' }, p.description) : null),
      p.actions ? h('div', { className:'rx-ph-actions' }, p.actions) : null);
  }
  function Tabs(p){
    var st = R.useState(p.defaultValue || (p.tabs && p.tabs[0] && p.tabs[0].id)), val = p.value != null ? p.value : st[0];
    return h('div', { className:'rx-tabs', role:'tablist' }, (p.tabs || []).map(function(t){
      var on = t.id === val;
      return h('button', { key:t.id, type:'button', role:'tab', 'aria-selected':on ? 'true' : 'false', tabIndex:on ? 0 : -1, className:cx('rx-tab', on && 'rx-tab-on'), onClick:function(){ st[1](t.id); p.onChange && p.onChange(t.id); } },
        t.label, t.count != null ? h('span', { className:'rx-tab-count' }, t.count) : null);
    }));
  }
  function StatCard(p){
    var dir = p.delta == null ? null : (String(p.delta).charAt(0) === '-' ? 'down' : 'up');
    return h('div', { className:'rx-stat' },
      h('div', { className:'rx-stat-label' }, p.label),
      h('div', { className:'rx-stat-value' }, p.value),
      p.delta != null ? h('div', { className:cx('rx-stat-delta', 'rx-stat-' + (p.good === dir ? 'good' : 'bad')) }, h(Icon, { name:dir === 'down' ? 'arrowDown' : 'arrowUp', size:14 }), h('span', null, p.delta), p.hint ? h('span', { className:'rx-stat-hint' }, p.hint) : null)
        : p.hint ? h('div', { className:'rx-stat-hint' }, p.hint) : null);
  }
  function DataTable(p){
    return h('div', { className:'rx-dt-wrap rx-scroll', style:{ maxHeight:p.maxHeight } },
      h('table', { className:'rx-dt' },
        h('thead', null, h('tr', null, (p.columns || []).map(function(c){ return h('th', { key:c.key, className:c.align === 'right' ? 'rx-r-num' : null, style:{ width:c.width } }, c.label); }))),
        h('tbody', null, (p.rows || []).map(function(r, i){
          return h('tr', { key:r.id || i, className:p.onRowClick ? 'rx-dt-click' : null, onClick:p.onRowClick ? function(){ p.onRowClick(r); } : null },
            (p.columns || []).map(function(c){ return h('td', { key:c.key, className:c.align === 'right' ? 'rx-r-num' : null }, c.render ? c.render(r) : r[c.key]); }));
        }))));
  }
  function ScrollArea(p){
    return h('div', { className:cx('rx-scroll rx-scroll-area', p.className), style:{ maxHeight:p.maxHeight, maxWidth:p.maxWidth }, tabIndex:0 }, p.children);
  }

  window.Rexor.__field = { Field:Field, aria:aria, useId:useId, omit:omit, cx:cx, FIELD_KEYS:FIELD_KEYS };
  Object.assign(window.Rexor, { Icon:Icon, TextField:TextField, TextArea:TextArea, Select:Select, Checkbox:Checkbox, RadioGroup:RadioGroup, Switch:Switch, AppShell:AppShell, PageHeader:PageHeader, Tabs:Tabs, StatCard:StatCard, DataTable:DataTable, ScrollArea:ScrollArea });
})();

(function(){
  var R = window.React, h = R.createElement, X = window.Rexor, F = X.__field;
  var Field = F.Field, aria = F.aria, useId = F.useId, omit = F.omit, cx = F.cx, KEYS = F.FIELD_KEYS, Icon = X.Icon;
  function useCtl(p, init){ var st = R.useState(p.defaultValue != null ? p.defaultValue : init); var v = p.value !== undefined ? p.value : st[0]; return [v, function(n){ if (p.value === undefined) st[1](n); p.onChange && p.onChange(n); }]; }
  function clamp(n, p){ if (p.min != null) n = Math.max(p.min, n); if (p.max != null) n = Math.min(p.max, n); return n; }

  function NumberField(p){
    var id = useId(p.id), c = useCtl(p, ''), v = c[0], set = c[1], step = p.step || 1;
    function bump(d){ var n = parseFloat(v); if (isNaN(n)) n = p.min != null ? p.min : 0; else n = n + d * step; set(clamp(Math.round(n / step) * step, p)); }
    var input = h('input', Object.assign(omit(p, KEYS.concat(['value','defaultValue','onChange','step'])), aria(p, id), { className:'rx-input rx-num-input rx-mono', type:'number', inputMode:'decimal', step:step, value:v, onChange:function(e){ set(e.target.value === '' ? '' : e.target.valueAsNumber); }, onBlur:function(){ if (v !== '' && !isNaN(v)) set(clamp(v, p)); } }));
    return Field(p, id, h('div', { className:cx('rx-num', p.disabled && 'rx-num-disabled') },
      h('button', { type:'button', className:'rx-num-btn', 'aria-label':'Decrease', tabIndex:-1, disabled:p.disabled || (p.min != null && v !== '' && v <= p.min), onClick:function(){ bump(-1); } }, h(Icon, { name:'minus', size:16 })),
      input,
      p.suffix ? h('span', { className:'rx-num-suf' }, p.suffix) : null,
      h('button', { type:'button', className:'rx-num-btn', 'aria-label':'Increase', tabIndex:-1, disabled:p.disabled || (p.max != null && v !== '' && v >= p.max), onClick:function(){ bump(1); } }, h(Icon, { name:'plus', size:16 }))));
  }

  function PasswordField(p){
    var id = useId(p.id), show = R.useState(false);
    return Field(p, id, h('div', { className:'rx-input-wrap-end' },
      h('input', Object.assign(omit(p, KEYS), aria(p, id), { className:cx('rx-input', 'rx-mono'), type:show[0] ? 'text' : 'password', autoComplete:p.autoComplete || 'off', spellCheck:false })),
      h('button', { type:'button', className:'rx-input-end-btn', 'aria-label':show[0] ? 'Hide value' : 'Show value', 'aria-pressed':show[0] ? 'true' : 'false', onClick:function(){ show[1](!show[0]); } }, h(Icon, { name:show[0] ? 'eyeOff' : 'eye', size:16 }))));
  }

  function SearchField(p){
    var id = useId(p.id), c = useCtl(p, ''), v = c[0], set = c[1];
    return Field(p, id, h('div', { className:'rx-input-wrap rx-input-wrap-end' },
      h(Icon, { name:'search', size:16, className:'rx-input-icon' }),
      h('input', Object.assign(omit(p, KEYS.concat(['value','defaultValue','onChange'])), aria(p, id), { className:'rx-input', type:'search', value:v, onChange:function(e){ set(e.target.value); }, onKeyDown:function(e){ if (e.key === 'Escape') set(''); } })),
      v ? h('button', { type:'button', className:'rx-input-end-btn', 'aria-label':'Clear search', onClick:function(){ set(''); } }, h(Icon, { name:'x', size:16 })) : null));
  }

  function DateField(p){
    var id = useId(p.id), t = p.type || 'date';
    return Field(p, id, h('input', Object.assign(omit(p, KEYS), aria(p, id), { className:'rx-input rx-date rx-mono', type:t })));
  }

  function CheckboxGroup(p){
    var name = useId(p.name), c = useCtl(p, []), v = c[0] || [], set = c[1];
    var all = (p.options || []).filter(function(o){ return !o.disabled; }).map(function(o){ return o.value; });
    var n = all.filter(function(x){ return v.indexOf(x) >= 0; }).length;
    var allRef = R.useRef(null);
    R.useEffect(function(){ if (allRef.current) allRef.current.indeterminate = n > 0 && n < all.length; });
    function toggle(x){ set(v.indexOf(x) >= 0 ? v.filter(function(y){ return y !== x; }) : v.concat([x])); }
    return h('fieldset', { className:cx('rx-fieldset', p.error && 'rx-field-invalid', p.className), 'aria-describedby':p.error ? name + '-err' : p.hint ? name + '-hint' : null },
      p.label ? h('legend', { className:'rx-label' }, p.label, p.required ? h('span', { className:'rx-req', 'aria-hidden':'true' }, ' *') : null) : null,
      p.hint && !p.error ? h('div', { className:'rx-hint rx-hint-top', id:name + '-hint' }, p.hint) : null,
      h('div', { className:cx('rx-checklist', p.columns === 2 && 'rx-checklist-2') },
        p.selectAll ? h('label', { className:'rx-check rx-check-all', htmlFor:name + '-all' },
          h('input', { id:name + '-all', ref:allRef, type:'checkbox', className:'rx-sr', checked:all.length > 0 && n === all.length, onChange:function(){ set(n === all.length ? [] : all.slice()); } }),
          h('span', { className:'rx-box', 'aria-hidden':'true' }, h(Icon, { name:'check', size:14 }), h('span', { className:'rx-box-dash' })),
          h('span', { className:'rx-check-text' }, h('span', null, p.selectAllLabel || 'Select all'), h('span', { className:'rx-check-desc' }, n + ' of ' + all.length + ' selected'))) : null,
        (p.options || []).map(function(o){
          var id = name + '-' + o.value;
          return h('label', { key:o.value, className:'rx-check', htmlFor:id },
            h('input', { id:id, type:'checkbox', className:'rx-sr', checked:v.indexOf(o.value) >= 0, disabled:o.disabled, onChange:function(){ toggle(o.value); } }),
            h('span', { className:'rx-box', 'aria-hidden':'true' }, h(Icon, { name:'check', size:14 })),
            h('span', { className:'rx-check-text' }, h('span', null, o.label), o.description ? h('span', { className:'rx-check-desc' }, o.description) : null));
        })),
      p.error ? h('div', { className:'rx-error', id:name + '-err' }, h(Icon, { name:'alert', size:16 }), h('span', null, p.error)) : null);
  }

  function SegmentedControl(p){
    var name = useId(p.name), c = useCtl(p, p.options && p.options[0] && p.options[0].value), v = c[0], set = c[1];
    return h('fieldset', { className:cx('rx-fieldset', p.className) },
      p.label ? h('legend', { className:'rx-label' }, p.label) : null,
      h('div', { className:'rx-seg' }, (p.options || []).map(function(o){
        var id = name + '-' + o.value;
        return h('label', { key:o.value, htmlFor:id, className:cx('rx-seg-item', v === o.value && 'rx-seg-on') },
          h('input', { id:id, type:'radio', name:name, className:'rx-sr', checked:v === o.value, disabled:o.disabled, onChange:function(){ set(o.value); } }),
          o.icon ? h(Icon, { name:o.icon, size:16 }) : null, h('span', null, o.label));
      })));
  }

  function Slider(p){
    var id = useId(p.id), min = p.min != null ? p.min : 0, max = p.max != null ? p.max : 100, c = useCtl(p, min), v = c[0], set = c[1];
    var pct = (v - min) / (max - min) * 100, fmt = p.format || function(x){ return x + (p.suffix || ''); };
    return h('div', { className:cx('rx-field', p.className) },
      h('div', { className:'rx-slider-head' }, p.label ? h('label', { className:'rx-label', htmlFor:id }, p.label) : null, h('output', { className:'rx-slider-val', htmlFor:id }, fmt(v))),
      h('input', { id:id, type:'range', className:'rx-slider', min:min, max:max, step:p.step || 1, value:v, disabled:p.disabled, style:{ '--rx-fill':pct + '%' }, onChange:function(e){ set(e.target.valueAsNumber); }, 'aria-describedby':p.hint ? id + '-hint' : null, 'aria-valuetext':fmt(v) }),
      p.marks ? h('div', { className:'rx-slider-marks', 'aria-hidden':'true' }, p.marks.map(function(m){ return h('span', { key:m }, fmt(m)); })) : null,
      p.hint ? h('div', { className:'rx-hint', id:id + '-hint' }, p.hint) : null);
  }

  function TagInput(p){
    var id = useId(p.id), c = useCtl(p, []), tags = c[0] || [], set = c[1], txt = R.useState('');
    function add(t){ t = t.trim(); if (t && tags.indexOf(t) < 0 && (!p.max || tags.length < p.max)) set(tags.concat([t])); txt[1](''); }
    return Field(p, id, h('div', { className:cx('rx-input rx-tags', p.error && 'rx-tags-invalid') , onClick:function(e){ var i = e.currentTarget.querySelector('input'); i && i.focus(); } },
      tags.map(function(t){ return h('span', { key:t, className:'rx-tag' }, h('span', { className:p.mono ? 'rx-mono' : null }, t), h('button', { type:'button', className:'rx-tag-x', 'aria-label':'Remove ' + t, onClick:function(){ set(tags.filter(function(x){ return x !== t; })); } }, h(Icon, { name:'x', size:12 }))); }),
      h('input', { id:id, className:cx('rx-tags-input', p.mono && 'rx-mono'), value:txt[0], placeholder:tags.length ? '' : p.placeholder, 'aria-invalid':p.error ? 'true' : null, 'aria-describedby':p.error ? id + '-err' : p.hint ? id + '-hint' : null, disabled:p.disabled,
        onChange:function(e){ var val = e.target.value; if (/[,\n]$/.test(val)) add(val.slice(0, -1)); else txt[1](val); },
        onKeyDown:function(e){ if (e.key === 'Enter') { e.preventDefault(); add(txt[0]); } else if (e.key === 'Backspace' && !txt[0] && tags.length) set(tags.slice(0, -1)); },
        onBlur:function(){ if (txt[0]) add(txt[0]); } })));
  }

  function fmtSize(b){ return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB'; }
  function FileUpload(p){
    var id = useId(p.id), c = useCtl(p, []), files = c[0] || [], set = c[1], drag = R.useState(false);
    function take(list){ var arr = Array.prototype.slice.call(list || []).map(function(f){ return { name:f.name, size:f.size, file:f }; }); set(p.multiple ? files.concat(arr) : arr.slice(0, 1)); }
    return h('div', { className:cx('rx-field', p.error && 'rx-field-invalid', p.className) },
      p.label ? h('label', { className:'rx-label', htmlFor:id }, p.label, p.optional ? h('span', { className:'rx-opt' }, ' (optional)') : null) : null,
      h('label', { htmlFor:id, className:cx('rx-drop', drag[0] && 'rx-drop-on', p.error && 'rx-drop-invalid'),
          onDragOver:function(e){ e.preventDefault(); drag[1](true); }, onDragLeave:function(){ drag[1](false); }, onDrop:function(e){ e.preventDefault(); drag[1](false); take(e.dataTransfer.files); } },
        h('input', { id:id, type:'file', className:'rx-sr', accept:p.accept, multiple:p.multiple, onChange:function(e){ take(e.target.files); e.target.value = ''; } }),
        h('span', { className:'rx-drop-icon' }, h(Icon, { name:'upload', size:20 })),
        h('span', { className:'rx-drop-text' }, h('b', null, 'Click to upload'), ' or drag and drop'),
        p.hint ? h('span', { className:'rx-drop-hint' }, p.hint) : null),
      files.length ? h('ul', { className:'rx-files' }, files.map(function(f, i){
        return h('li', { key:f.name + i }, h(Icon, { name:'file', size:16 }), h('span', { className:'rx-file-name' }, f.name), h('span', { className:'rx-file-size' }, fmtSize(f.size)),
          h('button', { type:'button', className:'rx-tag-x', 'aria-label':'Remove ' + f.name, onClick:function(){ set(files.filter(function(_, j){ return j !== i; })); } }, h(Icon, { name:'x', size:14 })));
      })) : null,
      p.error ? h('div', { className:'rx-error' }, h(Icon, { name:'alert', size:16 }), h('span', null, p.error)) : null);
  }

  Object.assign(window.Rexor, { NumberField:NumberField, PasswordField:PasswordField, SearchField:SearchField, DateField:DateField, CheckboxGroup:CheckboxGroup, SegmentedControl:SegmentedControl, Slider:Slider, TagInput:TagInput, FileUpload:FileUpload });
})();

(function(){
  var R = window.React, h = R.createElement, X = window.Rexor, Icon = X.Icon;
  function cx(){ return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function omit(p, keys){ var r = {}; for (var k in p) if (keys.indexOf(k) < 0) r[k] = p[k]; return r; }

  /* ---------- Small pieces ---------- */
  function Badge(p){
    return h('span', { className:cx('rx-badge', 'rx-badge-' + (p.tone || 'neutral'), p.mono !== false && 'rx-badge-mono', p.className), title:p.title }, p.children);
  }
  var DOT = { live:'Live', running:'Running', error:'Error', idle:'Idle' };
  function StatusDot(p){
    var s = DOT[p.status] ? p.status : 'idle';
    return h('span', { className:cx('rx-sdot', 'rx-sdot-' + s, p.className) }, h('span', { className:'rx-sdot-dot', 'aria-hidden':'true' }), p.label === false ? h('span', { className:'rx-sr' }, DOT[s]) : h('span', null, p.label || DOT[s]));
  }
  function IconButton(p){
    var rest = omit(p, ['icon','label','size','variant','className','badge']);
    return h('button', Object.assign(rest, { type:p.type || 'button', 'aria-label':p.label, title:p.title || p.label, className:cx('rx-ibtn', 'rx-ibtn-' + (p.size || 'md'), 'rx-ibtn-' + (p.variant || 'ghost'), p.className) }), h(Icon, { name:p.icon, size:p.size === 'sm' ? 16 : 18 }));
  }
  function ToggleButton(p){
    var st = R.useState(!!p.defaultPressed), on = p.pressed != null ? p.pressed : st[0];
    return h('button', { type:'button', className:cx('rx-tbtn', on && 'rx-tbtn-on', p.className), 'aria-pressed':on ? 'true' : 'false', title:p.title, disabled:p.disabled,
      onClick:function(){ if (p.pressed == null) st[1](!on); p.onChange && p.onChange(!on); } },
      p.icon ? h(Icon, { name:p.icon, size:16 }) : null, p.children ? h('span', null, p.children) : null);
  }
  function ThemeToggle(p){
    var st = R.useState(p.defaultValue || 'light'), v = p.value || st[0];
    function set(n){ if (!p.value) st[1](n); p.onChange && p.onChange(n); }
    return h('div', { className:cx('rx-theme', p.className), role:'radiogroup', 'aria-label':p.label || 'Theme' },
      ['light','dark'].map(function(t){
        return h('button', { key:t, type:'button', role:'radio', 'aria-checked':v === t ? 'true' : 'false', 'aria-label':t === 'light' ? 'Light theme' : 'Dark theme', title:t === 'light' ? 'Light' : 'Dark', className:cx('rx-theme-opt', v === t && 'rx-theme-on'), onClick:function(){ set(t); } }, h(Icon, { name:t === 'light' ? 'sun' : 'moon', size:16 }));
      }));
  }

  /* ---------- Dropdown menu ---------- */
  function DropdownMenu(p){
    var open = R.useState(false), isOpen = open[0], setOpen = open[1], act = R.useState(-1), ref = R.useRef(null), listRef = R.useRef(null);
    var items = p.items || [];
    R.useEffect(function(){
      if (!isOpen) return;
      function off(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
      document.addEventListener('mousedown', off);
      var first = items.findIndex(function(it){ return !it.divider && !it.disabled; }); act[1](p.value != null ? items.findIndex(function(it){ return it.id === p.value; }) : first);
      return function(){ document.removeEventListener('mousedown', off); };
    }, [isOpen]);
    R.useEffect(function(){ if (isOpen && listRef.current) { var el = listRef.current.querySelector('[data-i="' + act[0] + '"]'); el && el.focus(); } }, [isOpen, act[0]]);
    function choose(it){ if (it.disabled || it.divider) return; setOpen(false); p.onSelect && p.onSelect(it.id, it); }
    function key(e){
      if (e.key === 'Escape') { setOpen(false); ref.current.querySelector('.rx-dd-trigger').focus(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var d = e.key === 'ArrowDown' ? 1 : -1, i = act[0]; for (var n = 0; n < items.length; n++) { i = (i + d + items.length) % items.length; if (!items[i].divider && !items[i].disabled) break; } act[1](i); }
    }
    var sel = items.filter(function(it){ return it.id === p.value; })[0];
    return h('div', { className:cx('rx-dd', p.className), ref:ref, onKeyDown:key },
      h('button', { type:'button', className:cx('rx-btn', 'rx-btn-' + (p.variant || 'secondary'), 'rx-btn-' + (p.size || 'md'), 'rx-dd-trigger'), 'aria-haspopup':'menu', 'aria-expanded':isOpen ? 'true' : 'false', onClick:function(){ setOpen(!isOpen); } },
        p.icon ? h(Icon, { name:p.icon, size:16 }) : null,
        p.showSwatch && sel && sel.swatch ? h('span', { className:'rx-swatch', style:{ background:sel.swatch } }) : null,
        h('span', null, p.label || (sel && sel.label) || 'Select'),
        h(Icon, { name:'chevron', size:16, className:'rx-dd-chev' })),
      isOpen ? h('div', { className:cx('rx-menu', p.align === 'end' && 'rx-menu-end'), role:'menu', ref:listRef },
        p.heading ? h('div', { className:'rx-menu-head' }, p.heading) : null,
        items.map(function(it, i){
          if (it.divider) return h('div', { key:'d' + i, className:'rx-menu-div', role:'separator' });
          var checked = p.value != null && it.id === p.value;
          return h('button', { key:it.id, 'data-i':i, type:'button', role:p.value != null ? 'menuitemradio' : 'menuitem', 'aria-checked':p.value != null ? (checked ? 'true' : 'false') : null, tabIndex:i === act[0] ? 0 : -1, disabled:it.disabled, className:cx('rx-menu-item', it.danger && 'rx-menu-danger'), onClick:function(){ choose(it); }, onMouseEnter:function(){ act[1](i); } },
            it.swatch ? h('span', { className:'rx-swatch', style:{ background:it.swatch } }) : it.icon ? h(Icon, { name:it.icon, size:16 }) : p.value != null ? h('span', { className:'rx-menu-check' }, checked ? h(Icon, { name:'check', size:16 }) : null) : null,
            h('span', { className:'rx-menu-text' }, h('span', null, it.label), it.description ? h('span', { className:'rx-menu-desc' }, it.description) : null),
            it.shortcut ? h('kbd', { className:'rx-menu-kbd' }, it.shortcut) : (it.swatch && checked ? h(Icon, { name:'check', size:16, className:'rx-menu-tick' }) : null));
        })) : null);
  }

  /* ---------- Canvas controls ---------- */
  function ZoomControl(p){
    var v = p.value != null ? p.value : 1, min = p.min || 0.25, max = p.max || 2, step = p.step || 0.1;
    function set(n){ p.onChange && p.onChange(Math.round(Math.min(max, Math.max(min, n)) * 100) / 100); }
    return h('div', { className:'rx-zoom', role:'group', 'aria-label':'Zoom' },
      h(IconButton, { icon:'minus', label:'Zoom out', size:'sm', disabled:v <= min, onClick:function(){ set(v - step); } }),
      h('button', { type:'button', className:'rx-zoom-val', title:'Reset to 100%', onClick:function(){ set(1); } }, Math.round(v * 100) + '%'),
      h(IconButton, { icon:'plus', label:'Zoom in', size:'sm', disabled:v >= max, onClick:function(){ set(v + step); } }));
  }
  function CanvasToolbar(p){
    return h('div', { className:cx('rx-ctb', 'rx-ctb-' + (p.position || 'bottom-right'), p.className), role:'toolbar', 'aria-label':p.label || 'Canvas controls' },
      p.children);
  }
  function Divider(){ return h('span', { className:'rx-ctb-div', 'aria-hidden':'true' }); }
  CanvasToolbar.Divider = Divider;

  /* ---------- Architecture diagram ---------- */
  var KIND_ICON = { actor:'user', client:'window', service:'code', external:'external', target:'target', datastore:'database', server:'server' };
  var KIND_LABEL = { actor:'Actor', client:'Client', service:'Service', external:'External', target:'Attack target', datastore:'Data store', server:'Server' };
  function ArchNode(p){
    var kind = p.kind || 'service';
    var Tag = p.onClick ? 'button' : 'div';
    return h(Tag, { type:p.onClick ? 'button' : null, className:cx('rx-node', 'rx-node-' + kind, p.selected && 'rx-node-sel', p.dimmed && 'rx-node-dim', p.className), style:p.style, onClick:p.onClick, 'aria-pressed':p.onClick ? (p.selected ? 'true' : 'false') : null, title:KIND_LABEL[kind] },
      h('div', { className:'rx-node-top' }, h(Icon, { name:p.icon || KIND_ICON[kind] || 'code', size:16, className:'rx-node-icon' }), p.badge != null ? h(Badge, { tone:kind === 'target' ? 'brand' : 'outline' }, p.badge) : null),
      h('div', { className:'rx-node-title' }, p.title),
      p.subtitle ? h('div', { className:'rx-node-sub' }, p.subtitle) : null);
  }

  function anchor(a, b){
    var ac = { x:a.x + a.w / 2, y:a.y + a.h / 2 }, bc = { x:b.x + b.w / 2, y:b.y + b.h / 2 }, dx = bc.x - ac.x, dy = bc.y - ac.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      var s = dx > 0 ? 1 : -1, p1 = { x:ac.x + s * a.w / 2, y:ac.y }, p2 = { x:bc.x - s * b.w / 2, y:bc.y };
      if (Math.abs(p1.y - p2.y) < 2) return { d:'M' + p1.x + ' ' + p1.y + 'H' + p2.x, mid:{ x:(p1.x + p2.x) / 2, y:p1.y } };
      var mx = (p1.x + p2.x) / 2; return { d:'M' + p1.x + ' ' + p1.y + 'H' + mx + 'V' + p2.y + 'H' + p2.x, mid:{ x:mx, y:(p1.y + p2.y) / 2 } };
    }
    var t = dy > 0 ? 1 : -1, q1 = { x:ac.x, y:ac.y + t * a.h / 2 }, q2 = { x:bc.x, y:bc.y - t * b.h / 2 };
    if (Math.abs(q1.x - q2.x) < 2) return { d:'M' + q1.x + ' ' + q1.y + 'V' + q2.y, mid:{ x:q1.x, y:(q1.y + q2.y) / 2 } };
    var my = (q1.y + q2.y) / 2; return { d:'M' + q1.x + ' ' + q1.y + 'V' + my + 'H' + q2.x + 'V' + q2.y, mid:{ x:(q1.x + q2.x) / 2, y:my } };
  }

  function ArchDiagram(p){
    var W = p.width || 1200, H = p.height || 720;
    var zoom = R.useState(p.defaultZoom || 1), pan = R.useState({ x:0, y:0 }), sel = R.useState(null), path = R.useState(p.defaultPath !== false), lens = R.useState(p.defaultLens !== false), q = R.useState(''), searching = R.useState(false);
    var drag = R.useRef(null);
    var nodes = p.nodes || [], edges = p.edges || [], groups = p.groups || [];
    var byId = {}; nodes.forEach(function(n){ byId[n.id] = n; });
    var focusIds = null;
    if (q[0]) { var ql = q[0].toLowerCase(); focusIds = {}; nodes.forEach(function(n){ if ((n.title + ' ' + (n.subtitle || '')).toLowerCase().indexOf(ql) >= 0) focusIds[n.id] = 1; }); }
    else if (path[0] && sel[0]) { focusIds = {}; focusIds[sel[0]] = 1; edges.forEach(function(e){ if (e.from === sel[0]) focusIds[e.to] = 1; if (e.to === sel[0]) focusIds[e.from] = 1; }); }
    function edgeOn(e){ return !focusIds || (focusIds[e.from] && focusIds[e.to] && (!sel[0] || q[0] || e.from === sel[0] || e.to === sel[0])); }
    function down(e){ if (e.target.closest('.rx-node, .rx-ctb')) return; drag.current = { x:e.clientX - pan[0].x, y:e.clientY - pan[0].y }; e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); }
    function move(e){ if (drag.current) pan[1]({ x:e.clientX - drag.current.x, y:e.clientY - drag.current.y }); }
    function up(){ drag.current = null; }
    var tones = ['default','attack','async','muted','hot'];
    return h('div', { className:cx('rx-arch', p.className), style:{ height:p.viewportHeight || H } },
      h('div', { className:'rx-arch-viewport', onPointerDown:down, onPointerMove:move, onPointerUp:up, onPointerLeave:up, onClick:function(e){ if (!e.target.closest('.rx-node, .rx-ctb')) sel[1](null); } },
        h('div', { className:'rx-arch-stage', style:{ width:W, height:H, transform:'translate(' + pan[0].x + 'px,' + pan[0].y + 'px) scale(' + zoom[0] + ')' } },
          groups.map(function(g){
            return h('div', { key:g.id, className:cx('rx-group', 'rx-group-' + (g.tone || 'network')), style:{ left:g.x, top:g.y, width:g.w, height:g.h } }, h('span', { className:'rx-group-label' }, g.label));
          }),
          h('svg', { className:'rx-arch-edges', width:W, height:H, viewBox:'0 0 ' + W + ' ' + H, 'aria-hidden':'true' },
            h('defs', null, tones.map(function(t){ return h('marker', { key:t, id:'rx-arrow-' + t, viewBox:'0 0 10 10', refX:9, refY:5, markerWidth:8, markerHeight:8, orient:'auto-start-reverse', markerUnits:'userSpaceOnUse' }, h('path', { d:'M0 0L10 5L0 10z', className:'rx-arrow rx-arrow-' + t })); })),
            edges.map(function(e, i){
              var a = byId[e.from], b = byId[e.to]; if (!a || !b) return null;
              var r = anchor(a, b), tone = e.tone || (e.dashed ? 'async' : 'default'), on = edgeOn(e), hot = on && focusIds && sel[0] && !q[0];
              return h('path', { key:i, d:r.d, className:cx('rx-edge', 'rx-edge-' + tone, e.dashed && 'rx-edge-dashed', !on && 'rx-edge-dim', hot && 'rx-edge-hot'), markerEnd:'url(#rx-arrow-' + (hot && tone !== 'attack' ? 'hot' : tone) + ')', markerStart:e.both ? 'url(#rx-arrow-' + tone + ')' : null });
            })),
          lens[0] ? edges.map(function(e, i){
            var a = byId[e.from], b = byId[e.to]; if (!a || !b || !e.label) return null;
            var r = anchor(a, b), on = edgeOn(e), tone = e.tone || (e.dashed ? 'async' : 'default');
            return h('span', { key:'l' + i, className:cx('rx-edge-label', 'rx-edge-label-' + tone, !on && 'rx-edge-dim'), style:{ left:r.mid.x + (e.labelDx || 0), top:r.mid.y + (e.labelDy || 0) } }, e.label);
          }) : null,
          nodes.map(function(n){
            return h(ArchNode, { key:n.id, kind:n.kind, title:n.title, subtitle:n.subtitle, badge:n.badge, icon:n.icon, selected:sel[0] === n.id, dimmed:focusIds && !focusIds[n.id],
              style:{ position:'absolute', left:n.x, top:n.y, width:n.w, height:n.h }, onClick:function(){ sel[1](sel[0] === n.id ? null : n.id); p.onSelect && p.onSelect(n.id); } });
          }))),
      p.legend !== false ? h('div', { className:'rx-arch-legend' },
        h('span', null, h('i', { className:'rx-lg-line' }), 'Sync call'),
        h('span', null, h('i', { className:'rx-lg-line rx-lg-dash' }), 'Async'),
        h('span', null, h('i', { className:'rx-lg-line rx-lg-attack' }), 'Attack traffic')) : null,
      p.toolbar !== false ? h(CanvasToolbar, null,
        h(ToggleButton, { icon:'route', pressed:path[0], onChange:path[1], title:'Highlight the paths of the selected node' }, 'Path'),
        h(ToggleButton, { icon:'focus', pressed:lens[0], onChange:lens[1], title:'Show edge labels' }, 'Lens'),
        h(Divider),
        searching[0] ? h('input', { className:'rx-ctb-search', autoFocus:true, placeholder:'Find node…', value:q[0], onChange:function(e){ q[1](e.target.value); }, onKeyDown:function(e){ if (e.key === 'Escape') { q[1](''); searching[1](false); } }, 'aria-label':'Find node' })
          : h(IconButton, { icon:'search', label:'Find node', size:'sm', onClick:function(){ searching[1](true); } }),
        h(Divider),
        h(IconButton, { icon:'fit', label:'Fit to screen', size:'sm', onClick:function(){ zoom[1](1); pan[1]({ x:0, y:0 }); } }),
        h(ZoomControl, { value:zoom[0], onChange:zoom[1] })) : null);
  }

  Object.assign(window.Rexor, { Badge:Badge, StatusDot:StatusDot, IconButton:IconButton, ToggleButton:ToggleButton, ThemeToggle:ThemeToggle, DropdownMenu:DropdownMenu, ZoomControl:ZoomControl, CanvasToolbar:CanvasToolbar, ArchNode:ArchNode, ArchDiagram:ArchDiagram });
})();

(function(){
  var R = window.React, h = R.createElement, X = window.Rexor, Icon = X.Icon;
  var MARK = '/_blob/ff7a9f69302056878dfa18e6fb73c8e9', LOGO = '/_blob/8ef6875a76952f8394e8e31c1d0ae00c', LOGO_DARK = '/_blob/cba9cf9d8f757c2840b1cf47a371b2da';
  function cx(){ return Array.prototype.filter.call(arguments, Boolean).join(' '); }

  function ConsoleHeader(p){
    return h('header', { className:cx('rx-ch', p.className) },
      h('a', { className:'rx-ch-brand', href:p.href || '#', 'aria-label':'Rexor home' },
        h('img', { src:LOGO, alt:'Rexor', className:'rx-ch-logo rx-r-logo-light' }), h('img', { src:LOGO_DARK, alt:'', className:'rx-ch-logo rx-r-logo-dark' })),
      p.product ? h('span', { className:'rx-ch-product' }, p.product) : null,
      h('div', { className:'rx-ch-center' }, p.center),
      h('div', { className:'rx-ch-actions' }, p.actions));
  }

  function DotBackground(p){
    return h('div', { className:cx('rx-dots', 'rx-dots-' + (p.variant || 'hero'), p.className), style:p.style },
      h('div', { className:'rx-dots-layer', 'aria-hidden':'true' }),
      h('div', { className:'rx-dots-accent', 'aria-hidden':'true' }),
      h('div', { className:'rx-dots-content' }, p.children));
  }

  function ChatComposer(p){
    var st = R.useState(p.defaultValue || ''), v = p.value != null ? p.value : st[0], ta = R.useRef(null);
    function set(n){ if (p.value == null) st[1](n); p.onChange && p.onChange(n); }
    R.useEffect(function(){ var t = ta.current; if (!t) return; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, p.maxHeight || 240) + 'px'; }, [v]);
    var can = v.trim().length > 0 && !p.disabled;
    function send(){ if (p.streaming) { p.onStop && p.onStop(); return; } if (!can) return; p.onSend && p.onSend(v.trim()); set(''); }
    return h('div', { className:cx('rx-comp', 'rx-comp-' + (p.size || 'lg'), p.className) },
      h('div', { className:'rx-comp-box', onClick:function(e){ if (e.target === e.currentTarget) ta.current.focus(); } },
        p.attachments && p.attachments.length ? h('div', { className:'rx-comp-files' }, p.attachments.map(function(a, i){ return h('span', { key:i, className:'rx-tag' }, h(Icon, { name:'file', size:14 }), h('span', null, a)); })) : null,
        h('label', { className:'rx-sr', htmlFor:p.id || 'rx-composer' }, p.label || 'Message Rexor'),
        h('textarea', { id:p.id || 'rx-composer', ref:ta, className:'rx-comp-input', rows:1, value:v, placeholder:p.placeholder || 'Describe the bot or agent you want to test…', disabled:p.disabled, autoFocus:p.autoFocus,
          onChange:function(e){ set(e.target.value); },
          onKeyDown:function(e){ if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } } }),
        h('div', { className:'rx-comp-bar' },
          h('div', { className:'rx-comp-tools' },
            h(X.IconButton, { icon:'paperclip', label:'Attach a file (system prompt, OpenAPI spec, PDF)', size:'sm', onClick:p.onAttach }),
            p.tools),
          p.counter ? h('span', { className:'rx-comp-count' }, v.length + (p.maxLength ? ' / ' + p.maxLength : '')) : null,
          h('button', { type:'button', className:cx('rx-comp-send', (can || p.streaming) && 'rx-comp-send-on', p.streaming && 'rx-comp-stop'), 'aria-label':p.streaming ? 'Stop generating' : 'Send message', disabled:!can && !p.streaming, onClick:send },
            h(Icon, { name:p.streaming ? 'stop' : 'arrowUp', size:18 })))),
      p.hint !== false ? h('div', { className:'rx-comp-hint' }, p.hint || h(R.Fragment, null, h('kbd', null, 'Enter'), ' to send · ', h('kbd', null, 'Shift'), ' + ', h('kbd', null, 'Enter'), ' for a new line')) : null);
  }

  function ComposerChip(p){
    return h('button', { type:'button', className:cx('rx-comp-chip', p.active && 'rx-comp-chip-on'), onClick:p.onClick, title:p.title },
      p.icon ? h(Icon, { name:p.icon, size:14 }) : null, h('span', { className:'rx-comp-chip-k' }, p.label), p.value ? h('span', { className:'rx-comp-chip-v' }, p.value) : null, p.menu ? h(Icon, { name:'chevron', size:14 }) : null);
  }
  ChatComposer.Chip = ComposerChip;

  function PromptSuggestions(p){
    return h('div', { className:cx('rx-sugg', p.columns === 4 && 'rx-sugg-4'), role:'list' }, (p.items || []).map(function(it, i){
      return h('button', { key:i, type:'button', role:'listitem', className:'rx-sugg-item', onClick:function(){ p.onPick && p.onPick(it.prompt || it.title, it); } },
        h('span', { className:'rx-sugg-icon' }, h(Icon, { name:it.icon || 'sparkle', size:18 })),
        h('span', { className:'rx-sugg-text' }, h('span', { className:'rx-sugg-title' }, it.title), it.description ? h('span', { className:'rx-sugg-desc' }, it.description) : null),
        h(Icon, { name:'arrowUp', size:16, className:'rx-sugg-go' }));
    }));
  }

  function TypingIndicator(p){
    return h('span', { className:'rx-typing', role:'status', 'aria-label':p.label || 'Rexor is thinking' }, h('i'), h('i'), h('i'), p.text ? h('span', { className:'rx-typing-text' }, p.text) : null);
  }

  function ChatMessage(p){
    var role = p.role || 'assistant';
    if (role === 'user') return h('div', { className:'rx-msg rx-msg-user' }, h('div', { className:'rx-msg-bubble' }, p.children), p.time ? h('div', { className:'rx-msg-meta' }, p.time) : null);
    if (role === 'system') return h('div', { className:'rx-msg rx-msg-system', role:'note' }, h(Icon, { name:p.icon || 'shield', size:14 }), h('span', null, p.children));
    return h('div', { className:'rx-msg rx-msg-assistant' },
      h('div', { className:'rx-msg-avatar', 'aria-hidden':'true' }, h('img', { src:p.avatarSrc || MARK, alt:'' })),
      h('div', { className:'rx-msg-body' },
        h('div', { className:'rx-msg-head' }, h('span', { className:'rx-msg-name' }, p.name || 'Rexor'), p.time ? h('span', { className:'rx-msg-time' }, p.time) : null),
        p.streaming && !p.children ? h(TypingIndicator, { text:p.thinking }) : h('div', { className:'rx-msg-content' }, p.children),
        p.actions !== false && !p.streaming ? h('div', { className:'rx-msg-actions' },
          h(X.IconButton, { icon:'copy', label:'Copy', size:'sm' }), h(X.IconButton, { icon:'refresh', label:'Regenerate', size:'sm' })) : null));
  }

  function QuickReplies(p){
    return h('div', { className:'rx-qr', role:'group', 'aria-label':p.label || 'Suggested replies' }, (p.options || []).map(function(o, i){
      var label = typeof o === 'string' ? o : o.label;
      return h('button', { key:i, type:'button', className:'rx-qr-item', onClick:function(){ p.onPick && p.onPick(label); } }, label);
    }));
  }

  var STEP = { pending:{ icon:null, label:'Pending' }, running:{ icon:null, label:'Running' }, defended:{ icon:'check', label:'Defended' }, vulnerable:{ icon:'alert', label:'Vulnerable' } };
  function AttackPlan(p){
    var steps = p.steps || [];
    return h('section', { className:'rx-plan', 'aria-label':p.title },
      h('div', { className:'rx-plan-head' },
        h('div', null, h(X.Badge, { tone:'brand' }, p.eyebrow || 'ATLAS test plan'), h('h3', { className:'rx-plan-title' }, p.title), p.meta ? h('div', { className:'rx-plan-meta' }, p.meta) : null),
        p.target ? h('div', { className:'rx-plan-target' }, h(Icon, { name:'target', size:14 }), h('span', null, p.target)) : null),
      h('ol', { className:'rx-plan-steps' }, steps.map(function(s, i){
        var st = STEP[s.status] ? s.status : 'pending';
        return h('li', { key:i, className:'rx-plan-step rx-step-' + st },
          h('span', { className:'rx-step-mark', 'aria-label':STEP[st].label }, STEP[st].icon ? h(Icon, { name:STEP[st].icon, size:14 }) : i + 1),
          h('span', { className:'rx-step-text' }, h('span', { className:'rx-step-name' }, s.name), h('code', { className:'rx-step-id' }, s.technique)),
          s.detail ? h('span', { className:'rx-step-detail' }, s.detail) : null);
      })),
      p.actions ? h('div', { className:'rx-plan-actions' }, p.actions) : null);
  }

  Object.assign(window.Rexor, { ConsoleHeader:ConsoleHeader, DotBackground:DotBackground, ChatComposer:ChatComposer, PromptSuggestions:PromptSuggestions, ChatMessage:ChatMessage, TypingIndicator:TypingIndicator, QuickReplies:QuickReplies, AttackPlan:AttackPlan });
})();
