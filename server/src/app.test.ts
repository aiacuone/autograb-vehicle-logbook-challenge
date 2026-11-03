import { fileURLToPath } from 'node:url';
import {
  badgesResponseSchema,
  errorResponseSchema,
  makesResponseSchema,
  modelsResponseSchema,
} from '@logbook/shared';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { errorHandler } from './error-handler.js';
import { createLogger, requestLogger } from './logger.js';
import { loadVehicleData } from './vehicles.js';

const vehicles = loadVehicleData(
  fileURLToPath(new URL('../data/vehicles.json', import.meta.url)),
);

interface LogLine {
  level: number;
  msg?: string;
  req: { id: string; headers: Record<string, string> };
  res: { statusCode: number };
  err?: { message: string };
}

/** An app whose log lines are collected, so a test can read them. */
function testApp() {
  const lines: string[] = [];
  const logger = createLogger('info', {
    write: (line: string) => void lines.push(line),
  });
  const app = createApp({ vehicles, logger });
  return {
    app,
    logger,
    logs: () => lines.map((line) => JSON.parse(line) as LogLine),
  };
}

describe('GET /api/makes', () => {
  it('lists the makes', async () => {
    const res = await request(testApp().app).get('/api/makes').expect(200);
    expect(makesResponseSchema.parse(res.body)).toEqual([
      'ford',
      'bmw',
      'tesla',
    ]);
  });
});

describe('GET /api/makes/:make/models', () => {
  it('lists the models for a make', async () => {
    const res = await request(testApp().app)
      .get('/api/makes/ford/models')
      .expect(200);
    expect(modelsResponseSchema.parse(res.body)).toEqual([
      'Ranger',
      'Falcon',
      'Falcon Ute',
    ]);
  });

  it('answers 404 in the shared error shape for an unknown make', async () => {
    const res = await request(testApp().app)
      .get('/api/makes/saab/models')
      .expect(404);
    expect(errorResponseSchema.parse(res.body)).toMatchObject({
      code: 'NOT_FOUND',
      field: 'make',
    });
  });
});

describe('GET /api/makes/:make/models/:model/badges', () => {
  it('lists the badges for a model, including a model with a space in its name', async () => {
    const res = await request(testApp().app)
      .get('/api/makes/ford/models/Falcon%20Ute/badges')
      .expect(200);
    expect(badgesResponseSchema.parse(res.body)).toEqual(['XR6', 'XR6 Turbo']);
  });

  it('answers 404 for an unknown make', async () => {
    const res = await request(testApp().app)
      .get('/api/makes/saab/models/9-3/badges')
      .expect(404);
    expect(errorResponseSchema.parse(res.body)).toMatchObject({
      code: 'NOT_FOUND',
      field: 'make',
    });
  });

  it('answers 404 for a model that belongs to another make', async () => {
    const res = await request(testApp().app)
      .get('/api/makes/ford/models/130d/badges')
      .expect(404);
    expect(errorResponseSchema.parse(res.body)).toMatchObject({
      code: 'NOT_FOUND',
      field: 'model',
    });
  });

  it('does not treat object property names as makes or models', async () => {
    const { app } = testApp();
    await request(app).get('/api/makes/constructor/models').expect(404);
    await request(app).get('/api/makes/__proto__/models').expect(404);
    await request(app)
      .get('/api/makes/ford/models/toString/badges')
      .expect(404);
  });
});

describe('an unknown address under /api', () => {
  it('answers 404 in the shared error shape', async () => {
    const res = await request(testApp().app)
      .get('/api/nothing-here')
      .expect(404);
    expect(errorResponseSchema.parse(res.body)).toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('an unexpected error', () => {
  it('is answered with a generic 500 that reveals nothing, and is logged in full', async () => {
    const lines: string[] = [];
    const logger = createLogger('info', {
      write: (line: string) => void lines.push(line),
    });
    const app = express();
    app.use(requestLogger(logger));
    app.get('/boom', () => {
      throw new Error('secret connection string at /srv/app/db.js');
    });
    app.use(errorHandler);

    const res = await request(app).get('/boom').expect(500);

    expect(errorResponseSchema.parse(res.body).code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/secret|srv|db\.js|stack/i);
    const errorLine = lines
      .map((l) => JSON.parse(l))
      .find((l) => l.msg === 'Unexpected error');
    expect(errorLine.err.message).toContain('secret connection string');
    expect(errorLine?.level).toBe(50);
  });
});

describe('logging', () => {
  it('writes one JSON line for each request, with a request id', async () => {
    const { app, logs } = testApp();
    await request(app).get('/api/makes').expect(200);
    const entries = logs();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.req.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(entries[0]!.res.statusCode).toBe(200);
  });

  it('logs a failed lookup as a warning with its own request id', async () => {
    const { app, logs } = testApp();
    await request(app).get('/api/makes/saab/models').expect(404);
    const [entry] = logs();
    expect(entry!.level).toBe(40);
    expect(entry!.req.id).toBeTruthy();
  });

  it('redacts cookies and authorisation headers', async () => {
    const { app, logs } = testApp();
    await request(app)
      .get('/api/makes')
      .set('Cookie', 'session=abc123')
      .set('Authorization', 'Bearer token-xyz');
    const text = JSON.stringify(logs());
    expect(text).not.toContain('abc123');
    expect(text).not.toContain('token-xyz');
    expect(logs()[0]!.req.headers.cookie).toBe('[redacted]');
  });
});
