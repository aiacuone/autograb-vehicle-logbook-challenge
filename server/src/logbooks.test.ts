import { fileURLToPath } from 'node:url';
import {
  MAX_LOGBOOK_BYTES,
  errorResponseSchema,
  submitResponseSchema,
} from '@logbook/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { loadVehicleData } from './vehicles.js';

const vehicles = loadVehicleData(
  fileURLToPath(new URL('../data/vehicles.json', import.meta.url)),
);

function testApp() {
  const lines: string[] = [];
  const logger = createLogger('info', {
    write: (line: string) => void lines.push(line),
  });
  return {
    app: createApp({ vehicles, logger, config: loadConfig({}) }),
    logText: () => lines.join('\n'),
  };
}

const ranger = { make: 'ford', model: 'Ranger', badge: 'Raptor' };

/** A form with the given fields and, optionally, a logbook file. */
function upload(
  fields: Record<string, string>,
  file?: { content: Buffer | string; name?: string },
  app = testApp().app,
) {
  const req = request(app).post('/api/logbooks');
  for (const [name, value] of Object.entries(fields)) req.field(name, value);
  if (file) {
    const content =
      typeof file.content === 'string'
        ? Buffer.from(file.content)
        : file.content;
    req.attach('logbook', content, file.name ?? 'logbook.txt');
  }
  return req;
}

async function expectError(
  res: request.Response,
  status: number,
  code: string,
  field?: string,
) {
  expect(res.status).toBe(status);
  const body = errorResponseSchema.parse(res.body);
  expect(body.code).toBe(code);
  if (field) expect(body.field).toBe(field);
}

describe('a valid upload', () => {
  it('replies with the make, model, badge and the logbook text', async () => {
    const res = await upload(ranger, {
      content: 'Service at 10,000 km\nOil changed\n',
    });
    expect(res.status).toBe(200);
    expect(submitResponseSchema.parse(res.body)).toEqual({
      ...ranger,
      logbook: 'Service at 10,000 km\nOil changed\n',
    });
  });

  it('accepts any file name, tabs and non-English text', async () => {
    const text = 'Brake pads\t£120 ✓\r\nTyres rotated – 2024';
    const res = await upload(ranger, {
      content: text,
      name: 'service-history',
    });
    expect(res.status).toBe(200);
    expect(res.body.logbook).toBe(text);
  });

  it('strips a UTF-8 byte-order mark', async () => {
    const res = await upload(ranger, {
      content: Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from('Logbook'),
      ]),
    });
    expect(res.status).toBe(200);
    expect(res.body.logbook).toBe('Logbook');
  });

  it('accepts a model and badge with spaces in their names', async () => {
    const res = await upload(
      { make: 'ford', model: 'Falcon Ute', badge: 'XR6 Turbo' },
      { content: 'ok' },
    );
    expect(res.status).toBe(200);
  });

  it('accepts a file of exactly 3 MB', async () => {
    const res = await upload(ranger, {
      content: Buffer.alloc(MAX_LOGBOOK_BYTES, 'a'),
    });
    expect(res.status).toBe(200);
    expect(res.body.logbook).toHaveLength(MAX_LOGBOOK_BYTES);
  });
});

describe('the file', () => {
  it('is required (400)', async () => {
    await expectError(await upload(ranger), 400, 'FILE_MISSING', 'logbook');
  });

  it('must not be empty (400)', async () => {
    await expectError(
      await upload(ranger, { content: '' }),
      400,
      'FILE_MISSING',
      'logbook',
    );
  });

  it('must be at most 3 MB (413)', async () => {
    const res = await upload(ranger, {
      content: Buffer.alloc(MAX_LOGBOOK_BYTES + 1, 'a'),
    });
    await expectError(res, 413, 'FILE_TOO_LARGE', 'logbook');
  });

  it('must be text, so an image is rejected whatever its name (415)', async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
    ]);
    const res = await upload(ranger, { content: png, name: 'logbook.txt' });
    await expectError(res, 415, 'FILE_NOT_TEXT', 'logbook');
  });

  it('must be valid UTF-8 (415)', async () => {
    const res = await upload(ranger, {
      content: Buffer.from([0x4f, 0x6b, 0xc3, 0x28]),
    });
    await expectError(res, 415, 'FILE_NOT_TEXT');
  });

  it('must not contain NUL or other control characters (415)', async () => {
    await expectError(
      await upload(ranger, { content: 'Oil\u0000change' }),
      415,
      'FILE_NOT_TEXT',
    );
    await expectError(
      await upload(ranger, { content: 'Bell\u0007here' }),
      415,
      'FILE_NOT_TEXT',
    );
  });

  it('rejects a UTF-16 text file (415)', async () => {
    const utf16 = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from('Oil change', 'utf16le'),
    ]);
    await expectError(
      await upload(ranger, { content: utf16 }),
      415,
      'FILE_NOT_TEXT',
    );
  });

  it('must be one file in the logbook field (400)', async () => {
    const two = request(testApp().app)
      .post('/api/logbooks')
      .field('make', 'ford')
      .field('model', 'Ranger')
      .field('badge', 'Raptor')
      .attach('logbook', Buffer.from('one'), 'a.txt')
      .attach('logbook', Buffer.from('two'), 'b.txt');
    await expectError(await two, 400, 'INVALID_FIELD', 'logbook');

    const wrongField = request(testApp().app)
      .post('/api/logbooks')
      .field('make', 'ford')
      .field('model', 'Ranger')
      .field('badge', 'Raptor')
      .attach('notes', Buffer.from('text'), 'a.txt');
    await expectError(await wrongField, 400, 'INVALID_FIELD', 'logbook');
  });
});

describe('the make, model and badge (400)', () => {
  it('are all required, and the first missing one is named', async () => {
    const res = await upload(
      { make: 'ford', model: 'Ranger' },
      { content: 'x' },
    );
    await expectError(res, 400, 'INVALID_FIELD', 'badge');
  });

  it('are checked before the file', async () => {
    await expectError(
      await upload({ make: 'ford' }),
      400,
      'INVALID_FIELD',
      'model',
    );
  });

  it('reject an unknown make', async () => {
    const res = await upload({ ...ranger, make: 'saab' }, { content: 'x' });
    await expectError(res, 400, 'INVALID_FIELD', 'make');
  });

  it('reject a model that belongs to another make', async () => {
    const res = await upload({ ...ranger, model: '130d' }, { content: 'x' });
    await expectError(res, 400, 'INVALID_FIELD', 'model');
  });

  it('reject a badge that belongs to another model', async () => {
    const res = await upload({ ...ranger, badge: 'XR8' }, { content: 'x' });
    await expectError(res, 400, 'INVALID_FIELD', 'badge');
  });

  it('never treat object property names as vehicles', async () => {
    const res = await upload(
      { make: 'constructor', model: 'x', badge: 'y' },
      { content: 'x' },
    );
    await expectError(res, 400, 'INVALID_FIELD', 'make');
  });
});

describe('a request that is not a normal upload (400)', () => {
  it('rejects extra form fields', async () => {
    const res = await upload({ ...ranger, extra: 'x' }, { content: 'x' });
    await expectError(res, 400, 'INVALID_FIELD');
  });

  it('rejects a body that is not a multipart form', async () => {
    const res = await request(testApp().app).post('/api/logbooks').send(ranger);
    await expectError(res, 400, 'INVALID_FIELD', 'make');
  });

  it('rejects a broken multipart body without a server error', async () => {
    const res = await request(testApp().app)
      .post('/api/logbooks')
      .set('Content-Type', 'multipart/form-data; boundary=xyz')
      .send('--xyz\r\nContent-Disposition: form-data; name="make"\r\n\r\nford');
    await expectError(res, 400, 'INVALID_FIELD');
  });
});

describe('logging', () => {
  it('never writes the logbook text to the logs', async () => {
    const { app, logText } = testApp();
    const marker = 'PRIVATE-LOGBOOK-CONTENT-7f3a';
    const res = await upload(
      ranger,
      { content: `Owner notes: ${marker}` },
      app,
    );
    expect(res.status).toBe(200);
    expect(logText()).not.toBe('');
    expect(logText()).not.toContain(marker);
  });

  it('does not log the text of a rejected file either', async () => {
    const { app, logText } = testApp();
    const marker = 'PRIVATE-REJECTED-CONTENT-91c2';
    await upload(ranger, { content: `${marker}\u0000` }, app);
    expect(logText()).not.toContain(marker);
  });
});
