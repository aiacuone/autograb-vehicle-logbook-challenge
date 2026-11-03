import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';

function renderField(props: { hint?: string; error?: string } = {}) {
  render(
    <Field id="make" label="Make" {...props}>
      {(control) => (
        <select {...control}>
          <option>Choose a make</option>
        </select>
      )}
    </Field>,
  );
  return screen.getByRole('combobox', { name: 'Make' });
}

describe('Field', () => {
  it('ties the label to the control', () => {
    expect(renderField()).toBeInTheDocument();
  });

  it('describes the control by its hint', () => {
    const control = renderField({ hint: 'Choose a make to see its models.' });
    expect(control).toHaveAccessibleDescription(
      'Choose a make to see its models.',
    );
    expect(control).not.toHaveAttribute('aria-invalid');
  });

  it('marks the control invalid and describes it by its error, announced as an alert', () => {
    const control = renderField({ error: 'Choose a make.' });
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveAccessibleDescription('Choose a make.');
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a make.');
  });

  it('describes the control by both the hint and the error', () => {
    const control = renderField({ hint: 'A hint.', error: 'An error.' });
    expect(control).toHaveAccessibleDescription('A hint. An error.');
  });

  it('has no description when there is no hint or error', () => {
    expect(renderField()).not.toHaveAttribute('aria-describedby');
  });
});
