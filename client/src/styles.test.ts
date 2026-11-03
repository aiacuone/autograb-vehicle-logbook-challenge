import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Read as plain text, because the test environment does not process CSS
const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'styles.css'),
  'utf8',
);

describe('the stylesheet', () => {
  it('has a visible focus outline', () => {
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline:\s*3px solid/);
  });

  it('never removes an outline', () => {
    expect(css).not.toMatch(/outline\s*:\s*(none|0)\b/i);
    expect(css).not.toMatch(/outline-width\s*:\s*0/i);
  });
});
