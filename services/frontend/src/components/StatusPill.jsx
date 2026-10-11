const LABEL = { vulnerable: 'Vulnerable', defended: 'Defended', running: 'Running', queued: 'Queued' };

export default function StatusPill({ status = 'queued', children, className }) {
  const classes = ['rx-pill', `rx-pill-${status}`, className].filter(Boolean).join(' ');
  return (
    <span className={classes}>
      <span className="rx-pill-dot" aria-hidden="true" />
      {children || LABEL[status] || status}
    </span>
  );
}
