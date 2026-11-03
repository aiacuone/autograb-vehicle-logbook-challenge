import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { loadVehicleData } from './vehicles.js';

const vehicles = loadVehicleData(
  fileURLToPath(new URL('../data/vehicles.json', import.meta.url)),
);

/** A small stand-in for the built client: a main page and one script. */
function fakeClientBuild() {
  const dir = mkdtempSync(join(tmpdir(), 'logbook-client-'));
  writeFileSync(
    join(dir, 'index.html'),
    '<!doctype html><div id="root"></div>',
  );
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'assets', 'app.js'), 'console.log("app");');
  return dir;
}

function appServing(clientDir: string) {
  const logger = createLogger('silent');
  return createApp({
    vehicles,
    logger,
    config: { ...loadConfig({}), clientDir },
  });
}

describe('serving the built client', () => {
  const app = appServing(fakeClientBuild());

  it.each(['/', '/result', '/no/such/page'])(
    'answers the page address %s with the main page',
    async (path) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
      expect(res.text).toContain('<div id="root">');
    },
  );

  it('serves a real file as itself', async () => {
    const res = await request(app).get('/assets/app.js');
    expect(res.status).toBe(200);
    expect(res.type).toBe('text/javascript');
  });

  it('answers a missing script with not found, not the main page', async () => {
    const res = await request(app).get('/assets/missing.js');
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('<div id="root">');
  });

  it('never answers an API address with the main page', async () => {
    const res = await request(app).get('/api/no-such-thing');
    expect(res.status).toBe(404);
    expect(res.type).toBe('application/json');
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('still answers the API', async () => {
    const res = await request(app).get('/api/makes');
    expect(res.status).toBe(200);
    expect(res.body).toContain('ford');
  });

  it('does not answer a POST to a page address with the main page', async () => {
    const res = await request(app).post('/result');
    expect(res.status).toBe(404);
  });
});

describe('with no client build', () => {
  it('serves the API only', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'logbook-empty-'));
    const app = appServing(empty);
    expect((await request(app).get('/')).status).toBe(404);
    expect((await request(app).get('/api/makes')).status).toBe(200);
  });
});
