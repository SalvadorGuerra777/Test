import { useId } from 'react';

// Ported from the design system's SegmentedControl (hidden radio group +
// rx-seg/rx-seg-item/rx-seg-on, class names verbatim) — used here as the
// chat/classic view switch in the topbar.
export default function SegmentedControl({ label, options, value, onChange, className }) {
  const name = useId();
  return (
    <fieldset className={['rx-fieldset', 'rx-seg-fieldset', className].filter(Boolean).join(' ')}>
      {label ? <legend className="rx-sr">{label}</legend> : null}
      <div className="rx-seg">
        {options.map((o) => {
          const id = `${name}-${o.value}`;
          return (
            <label key={o.value} htmlFor={id} className={['rx-seg-item', value === o.value ? 'rx-seg-on' : ''].filter(Boolean).join(' ')}>
              <input
                id={id}
                type="radio"
                name={name}
                className="rx-sr"
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
