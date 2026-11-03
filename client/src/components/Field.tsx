import type { ReactNode } from 'react';

/** What a control inside a Field needs, so its label, hint and error are all linked to it. */
export interface FieldControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
}

interface FieldProps {
  id: string;
  label: string;
  /** A short visible reason or instruction, for example why a control is disabled. */
  hint?: string;
  /** The message for a failed field. Announced when it appears. */
  error?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/** A label, a control, an optional hint and an optional error, tied together by id. */
export function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {hint ? (
        <p id={hintId} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
