import Field from './Field.jsx';

export default function TextField({ label, hint, error, required, optional, mono, className, ...rest }) {
  return (
    <Field label={label} htmlFor={rest.id} hint={hint} error={error} required={required} optional={optional}>
      <input
        className={['rx-input', mono ? 'rx-mono' : '', className].filter(Boolean).join(' ')}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      />
    </Field>
  );
}
