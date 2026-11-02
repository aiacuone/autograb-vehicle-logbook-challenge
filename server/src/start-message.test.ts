import { describe, expect, it } from 'vitest';
import { startMessage } from './start-message.js';

describe('server', () => {
  it('builds its start message from the shared app name', () => {
    expect(startMessage()).toBe('Vehicle logbook server');
  });
});
