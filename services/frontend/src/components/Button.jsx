export default function Button({ variant = 'secondary', size = 'md', className, children, ...rest }) {
  const classes = ['rx-btn', `rx-btn-${variant}`, `rx-btn-${size}`, className].filter(Boolean).join(' ');
  return (
    <button type={rest.type || 'button'} className={classes} {...rest}>
      {children}
    </button>
  );
}
