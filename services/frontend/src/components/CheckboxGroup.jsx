import { CheckIcon } from './Icon.jsx';

// Checklist of independent options (any subset can be checked), with an
// optional "select all" row that tracks a partial/indeterminate state.
// Ported from the design system's CheckboxGroup (README: value/onChange as
// string[], selectAll shows "N of M selected" and goes indeterminate).
export default function CheckboxGroup({ label, options, value, onChange, selectAll, required, hint, error, scroll }) {
  const selectableValues = options.filter((o) => !o.disabled).map((o) => o.value);
  const selectedCount = value.filter((v) => selectableValues.includes(v)).length;
  const allSelected = selectableValues.length > 0 && selectedCount === selectableValues.length;
  const noneSelected = selectedCount === 0;

  function toggle(v) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }
  function toggleAll() {
    onChange(allSelected ? [] : selectableValues);
  }

  return (
    <fieldset className="rx-fieldset">
      <legend className="rx-label">
        {label}
        {required ? <span className="rx-req"> *</span> : null}
      </legend>

      {selectAll ? (
        <label className="rx-check rx-check-all">
          <input
            type="checkbox"
            className="rx-sr"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = !allSelected && !noneSelected;
            }}
            onChange={toggleAll}
          />
          <span className="rx-box">
            <CheckIcon />
          </span>
          <span className="rx-check-text">
            {allSelected ? 'All selected' : `${selectedCount} of ${selectableValues.length} selected`}
          </span>
        </label>
      ) : null}

      <div className={['rx-radio-list', scroll ? 'rx-radio-list-scroll' : ''].filter(Boolean).join(' ')}>
        {options.map((o) => (
          <label key={o.value} className={['rx-check', o.disabled ? 'rx-check-disabled' : ''].filter(Boolean).join(' ')}>
            <input
              type="checkbox"
              className="rx-sr"
              checked={value.includes(o.value)}
              disabled={o.disabled}
              onChange={() => toggle(o.value)}
            />
            <span className="rx-box">
              <CheckIcon />
            </span>
            <span className="rx-check-text">
              <span>{o.label}</span>
              {o.description ? <span className="rx-check-desc">{o.description}</span> : null}
            </span>
          </label>
        ))}
      </div>

      {error ? (
        <div className="rx-error" role="alert">
          {error}
        </div>
      ) : hint ? (
        <div className="rx-hint">{hint}</div>
      ) : null}
    </fieldset>
  );
}
