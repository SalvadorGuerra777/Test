import { ErrorIcon } from './Icon.jsx';

export default function Field({ label, htmlFor, hint, error, required, optional, children }) {
  return (
    <div className="rx-field">
      {label ? (
        <label className="rx-label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="rx-req"> *</span> : null}
          {optional ? <span className="rx-opt"> (optional)</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <div className="rx-error" role="alert">
          <ErrorIcon />
          <span>{error}</span>
        </div>
      ) : hint ? (
        <div className="rx-hint">{hint}</div>
      ) : null}
    </div>
  );
}
