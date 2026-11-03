import type { OptionsState } from '../api/use-options';
import { Field } from './Field';

interface OptionSelectProps {
  id: string;
  label: string;
  /** The current choice, or null for none. */
  value: string | null;
  options: OptionsState;
  /** The placeholder's noun, for example "model" gives "Choose a model". */
  noun: string;
  hint: string;
  /** What the user can do when the list fails to load, for example "Refresh the page to try again." */
  retryHint: string;
  /** How an option is shown. Defaults to the option itself. */
  optionLabel?: (option: string) => string;
  onChange: (value: string | null) => void;
}

/**
 * One dropdown, disabled until its options have loaded. The placeholder clears the choice
 * and says when the list is loading. A failed list shows its error in place of the hint,
 * on the same line, so the page does not shift.
 */
export function OptionSelect({
  id,
  label,
  value,
  options,
  noun,
  hint,
  retryHint,
  optionLabel = (option) => option,
  onChange,
}: OptionSelectProps) {
  const list = options.status === 'loaded' ? options.options : [];
  const placeholder =
    options.status === 'loading' ? `Loading ${noun}s…` : `Choose a ${noun}`;
  const failed = options.status === 'failed';

  return (
    <Field
      id={id}
      label={label}
      hint={failed ? undefined : hint}
      error={
        failed ? `The ${noun}s could not be loaded. ${retryHint}` : undefined
      }
    >
      {(control) => (
        <select
          {...control}
          value={value ?? ''}
          disabled={options.status !== 'loaded'}
          onChange={(event) => onChange(event.target.value || null)}
        >
          <option value="">{placeholder}</option>
          {list.map((option) => (
            <option key={option} value={option}>
              {optionLabel(option)}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
