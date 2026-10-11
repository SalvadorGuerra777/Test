import Field from './Field.jsx';

export default function TextAreaField({ label, hint, error, required, optional, mono, className, ...rest }) {
  return (
    <Field label={label} htmlFor={rest.id} hint={hint} error={error} required={required} optional={optional}>
      <textarea
        className={['rx-input', 'rx-textarea', mono ? 'rx-mono' : '', className].filter(Boolean).join(' ')}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      />
    </Field>
  );
}
