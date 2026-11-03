import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitLogbook } from './submit-logbook';

const vehicle = { make: 'ford', model: 'Ranger', badge: 'Raptor' };
const file = new File(['trip log'], 'trip.txt', { type: 'text/plain' });

function reply(body: unknown, status = 200) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('submitLogbook', () => {
  it('posts the vehicle and the file as multipart form data, with no content type of its own', async () => {
    const fetchMock = reply({ ...vehicle, logbook: 'trip log' });
    await submitLogbook(vehicle, file);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('/api/logbooks');
    expect(init.method).toBe('POST');
    expect(init.headers).toBeUndefined();
    const body = init.body as FormData;
    expect(body.get('make')).toBe('ford');
    expect(body.get('model')).toBe('Ranger');
    expect(body.get('badge')).toBe('Raptor');
    expect((body.get('logbook') as File).name).toBe('trip.txt');
  });

  it('returns the reply on success', async () => {
    reply({ ...vehicle, logbook: 'trip log' });
    expect(await submitLogbook(vehicle, file)).toEqual({
      ok: true,
      reply: { ...vehicle, logbook: 'trip log' },
    });
  });

  it("returns the server's error, with its code and field", async () => {
    const error = {
      code: 'FILE_NOT_TEXT',
      message: 'Only plain text.',
      field: 'logbook',
    };
    reply(error, 400);
    expect(await submitLogbook(vehicle, file)).toEqual({ ok: false, error });
  });

  it('returns a general error when the request cannot be made', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const result = await submitLogbook(vehicle, file);
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
  });

  it('returns a general error when the reply is not JSON, such as a proxy error page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response('<html>Bad gateway</html>', { status: 502 }),
        ),
      ),
    );
    expect(await submitLogbook(vehicle, file)).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
  });

  it('returns a general error when an error reply has an unexpected shape', async () => {
    reply({ oops: true }, 500);
    expect(await submitLogbook(vehicle, file)).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
  });
});
