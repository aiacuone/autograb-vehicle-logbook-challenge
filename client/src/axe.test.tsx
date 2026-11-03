import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { accessibilityProblems } from './axe';

describe('accessibilityProblems', () => {
  it('reports a control with no label, naming the rule', async () => {
    const { container } = render(
      <select>
        <option>Choose</option>
      </select>,
    );
    const problems = await accessibilityProblems(container);
    expect(problems.join('\n')).toMatch(/^select-name:/m);
  });

  it('reports nothing for a labelled control', async () => {
    const { container } = render(
      <>
        <label htmlFor="make">Make</label>
        <select id="make">
          <option>Choose</option>
        </select>
      </>,
    );
    expect(await accessibilityProblems(container)).toEqual([]);
  });
});
