import { describe, expect, it } from 'vitest';
import { makeDisplayName, vehicleLabel } from './display.js';

describe('makeDisplayName', () => {
  it('uses the map for a known make', () => {
    expect(makeDisplayName('bmw')).toBe('BMW');
  });

  it('falls back to the make itself, including for names Object already has', () => {
    expect(makeDisplayName('holden')).toBe('holden');
    expect(makeDisplayName('toString')).toBe('toString');
  });
});

describe('vehicleLabel', () => {
  it('joins the display name, model and badge', () => {
    expect(
      vehicleLabel({ make: 'ford', model: 'Ranger', badge: 'Raptor' }),
    ).toBe('Ford Ranger Raptor');
  });
});
