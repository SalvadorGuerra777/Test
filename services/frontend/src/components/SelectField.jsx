import Field from './Field.jsx';
import { ChevronIcon } from './Icon.jsx';

export default function SelectField({ label, hint, error, required, className, children, ...rest }) {
  return (
    <Field label={label} htmlFor={rest.id} hint={hint} error={error} required={required}>
      <div className="rx-select-wrap">
        <select className={['rx-input', 'rx-select', className].filter(Boolean).join(' ')} aria-invalid={error ? 'true' : undefined} {...rest}>
          {children}
        </select>
        <span className="rx-select-chev">
          <ChevronIcon />
        </span>
      </div>
    </Field>
  );
}
