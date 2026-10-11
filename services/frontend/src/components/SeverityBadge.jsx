const LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' };

export default function SeverityBadge({ severity = 'info', children, className }) {
  const s = LABEL[severity] ? severity : 'info';
  const classes = ['rx-sev', `rx-sev-${s}`, className].filter(Boolean).join(' ');
  return (
    <span className={classes}>
      <span className="rx-sev-dot" aria-hidden="true" />
      {children || LABEL[s]}
    </span>
  );
}
