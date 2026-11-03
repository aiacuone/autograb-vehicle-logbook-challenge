import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config.js';

const builtClient = fileURLToPath(
  new URL('../../client/dist', import.meta.url),
);

describe('loadConfig', () => {
  it('uses the defaults when nothing is set', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      logLevel: 'info',
      trustedProxyCount: 0,
      rateLimitWindowMs: 60_000,
      rateLimitMax: 10,
      clientDir: builtClient,
    });
  });

  it('reads overrides, which arrive as text', () => {
    const config = loadConfig({
      PORT: '8080',
      LOG_LEVEL: 'debug',
      TRUSTED_PROXY_COUNT: '1',
      RATE_LIMIT_WINDOW_MS: '5000',
      RATE_LIMIT_MAX: '3',
      CLIENT_DIR: 'public',
    });
    expect(config).toEqual({
      port: 8080,
      logLevel: 'debug',
      trustedProxyCount: 1,
      rateLimitWindowMs: 5000,
      rateLimitMax: 3,
      clientDir: resolve('public'),
    });
  });

  it('treats an empty value as unset', () => {
    expect(loadConfig({ PORT: '' }).port).toBe(3000);
  });

  it('rejects a bad value with a message that names the setting', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(ConfigError);
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadConfig({ LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
    expect(() => loadConfig({ TRUSTED_PROXY_COUNT: '-1' })).toThrow(
      /TRUSTED_PROXY_COUNT/,
    );
  });

  it('names every bad setting at once', () => {
    expect(() => loadConfig({ PORT: '0', RATE_LIMIT_MAX: 'x' })).toThrow(
      /PORT.*RATE_LIMIT_MAX/,
    );
  });
});
