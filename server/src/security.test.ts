import { fileURLToPath } from 'node:url';
import { errorResponseSchema } from '@logbook/shared';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { loadVehicleData } from './vehicles.js';

const vehicles = loadVehicleData(
  fileURLToPath(new URL('../data/vehicles.json', import.meta.url)),
);
const silentLogger = createLogger('silent');

function testApp(env: Record<string, string> = {}) {
  return createApp({ vehicles, logger: silentLogger, config: loadConfig(env) });
}

function uploadFrom(app: ReturnType<typeof testApp>, forwardedFor?: string) {
  const req = request(app)
    .post('/api/logbooks')
    .field('make', 'ford')
    .field('model', 'Ranger')
    .field('badge', 'Raptor')
    .attach('logbook', Buffer.from('Oil changed'), 'logbook.txt');
  return forwardedFor ? req.set('X-Forwarded-For', forwardedFor) : req;
}

// The rate limiter's own forwarded-address check is off, so nothing should reach the console
beforeEach(() => {
  vi.spyOn(console, 'error');
});
afterEach(() => {
  expect(console.error).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

describe('security headers', () => {
  it('are on every response, including a content policy', async () => {
    const res = await request(testApp()).get('/api/makes').expect(200);
    expect(res.headers['content-security-policy']).toContain(
      "default-src 'self'",
    );
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
  });

  it('do not force HTTPS, since the app is served over plain HTTP', async () => {
    const res = await request(testApp()).get('/api/makes');
    expect(res.headers['content-security-policy']).not.toContain(
      'upgrade-insecure-requests',
    );
  });

  it('do not reveal the framework', async () => {
    const res = await request(testApp()).get('/api/makes');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('are also on error replies', async () => {
    const res = await request(testApp()).get('/api/nothing').expect(404);
    expect(res.headers['content-security-policy']).toBeDefined();
  });
});

describe('cross-origin access', () => {
  it('is never granted, even when another site asks', async () => {
    const res = await request(testApp())
      .get('/api/makes')
      .set('Origin', 'https://other-site.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('is not granted to a preflight request either', async () => {
    const res = await request(testApp())
      .options('/api/logbooks')
      .set('Origin', 'https://other-site.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('upload rate limit', () => {
  it('answers a visitor over the limit with a 429 in the shared error shape', async () => {
    const app = testApp({ RATE_LIMIT_MAX: '2' });
    await uploadFrom(app).expect(200);
    await uploadFrom(app).expect(200);
    const res = await uploadFrom(app).expect(429);
    expect(errorResponseSchema.parse(res.body).code).toBe('RATE_LIMITED');
    expect(res.headers['ratelimit']).toBeDefined();
  });

  it('does not limit the dropdown lists', async () => {
    const app = testApp({ RATE_LIMIT_MAX: '1' });
    await uploadFrom(app).expect(200);
    await uploadFrom(app).expect(429);
    for (let i = 0; i < 5; i++)
      await request(app).get('/api/makes').expect(200);
  });

  it('ignores a faked forwarded address when no proxy is configured', async () => {
    const app = testApp({ RATE_LIMIT_MAX: '2' });
    await uploadFrom(app, '203.0.113.1').expect(200);
    await uploadFrom(app, '203.0.113.2').expect(200);
    // A new fake address does not earn a new count: every request is the same visitor
    await uploadFrom(app, '203.0.113.3').expect(429);
  });

  it('counts each visitor separately behind a configured proxy', async () => {
    const app = testApp({ RATE_LIMIT_MAX: '2', TRUSTED_PROXY_COUNT: '1' });
    await uploadFrom(app, '203.0.113.1').expect(200);
    await uploadFrom(app, '203.0.113.1').expect(200);
    await uploadFrom(app, '203.0.113.1').expect(429);
    await uploadFrom(app, '203.0.113.2').expect(200);
  });
});

describe('a forwarded address with no proxy configured', () => {
  function appWithLogs(env: Record<string, string> = {}) {
    const lines: string[] = [];
    const logger = createLogger('info', {
      write: (line: string) => void lines.push(line),
    });
    const app = createApp({ vehicles, logger, config: loadConfig(env) });
    const warnings = () =>
      lines
        .map((line) => JSON.parse(line) as { level: number; msg: string })
        .filter((entry) => entry.msg.includes('TRUSTED_PROXY_COUNT'));
    return { app, warnings };
  }

  it('is reported once, as a JSON warning line', async () => {
    const { app, warnings } = appWithLogs();
    await request(app)
      .get('/api/makes')
      .set('X-Forwarded-For', '203.0.113.1')
      .expect(200);
    await request(app)
      .get('/api/makes')
      .set('X-Forwarded-For', '203.0.113.2')
      .expect(200);
    expect(warnings()).toHaveLength(1);
    expect(warnings()[0]!.level).toBe(40);
  });

  it('is not reported when a proxy is configured', async () => {
    const { app, warnings } = appWithLogs({ TRUSTED_PROXY_COUNT: '1' });
    await request(app)
      .get('/api/makes')
      .set('X-Forwarded-For', '203.0.113.1')
      .expect(200);
    expect(warnings()).toHaveLength(0);
  });
});
