import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOptions } from './use-options';

interface PendingRequest {
  url: string;
  signal: AbortSignal;
  reply: (body: unknown, status?: number) => Promise<void>;
}

/**
 * A fetch that answers only when the test says so. It ignores the abort signal on
 * purpose, like a reply already on its way, so the hook itself must drop stale replies.
 */
function controlledFetch() {
  const requests: PendingRequest[] = [];
  const fetchMock = vi.fn(
    (url: string, init: RequestInit) =>
      new Promise<Response>((resolve) => {
        requests.push({
          url,
          signal: init.signal as AbortSignal,
          reply: async (body, status = 200) => {
            await act(async () => {
              resolve(new Response(JSON.stringify(body), { status }));
            });
          },
        });
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return { requests, fetchMock };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useOptions', () => {
  it('asks for nothing while the url is null', () => {
    const { fetchMock } = controlledFetch();
    const { result } = renderHook(() => useOptions(null));
    expect(result.current).toEqual({ status: 'idle' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is loading until the reply arrives, then holds the options', async () => {
    const { requests } = controlledFetch();
    const { result } = renderHook(() => useOptions('/api/makes'));
    expect(result.current).toEqual({ status: 'loading' });

    await requests[0]!.reply(['ford', 'bmw']);
    expect(result.current).toEqual({
      status: 'loaded',
      options: ['ford', 'bmw'],
    });
  });

  it('fails on an error reply', async () => {
    const { requests } = controlledFetch();
    const { result } = renderHook(() => useOptions('/api/makes'));
    await requests[0]!.reply({ code: 'INTERNAL_ERROR', message: 'x' }, 500);
    expect(result.current).toEqual({ status: 'failed' });
  });

  it('fails when the request itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const { result } = renderHook(() => useOptions('/api/makes'));
    await waitFor(() => expect(result.current).toEqual({ status: 'failed' }));
  });

  it('reads as loading at once when the url changes, not as the old list', async () => {
    const { requests } = controlledFetch();
    const { result, rerender } = renderHook(({ url }) => useOptions(url), {
      initialProps: { url: '/api/makes/ford/models' },
    });
    await requests[0]!.reply(['Ranger']);

    rerender({ url: '/api/makes/bmw/models' });
    expect(result.current).toEqual({ status: 'loading' });
  });

  it('never lets an old reply overwrite a newer one after a quick change', async () => {
    const { requests } = controlledFetch();
    const { result, rerender } = renderHook(({ url }) => useOptions(url), {
      initialProps: { url: '/api/makes/ford/models' },
    });
    rerender({ url: '/api/makes/bmw/models' });

    const [ford, bmw] = requests;
    expect(ford!.signal.aborted).toBe(true);
    expect(bmw!.signal.aborted).toBe(false);

    // The newer reply arrives first, then the old one
    await bmw!.reply(['130d']);
    await ford!.reply(['Ranger']);
    expect(result.current).toEqual({ status: 'loaded', options: ['130d'] });
  });

  it('ignores an old failure after a quick change', async () => {
    const { requests } = controlledFetch();
    const { result, rerender } = renderHook(({ url }) => useOptions(url), {
      initialProps: { url: '/api/makes/ford/models' },
    });
    rerender({ url: '/api/makes/bmw/models' });

    await requests[0]!.reply({ code: 'INTERNAL_ERROR', message: 'x' }, 500);
    expect(result.current).toEqual({ status: 'loading' });
  });

  it('aborts the request when the url is cleared or the page goes away', () => {
    const { requests } = controlledFetch();
    const { result, rerender, unmount } = renderHook(
      ({ url }: { url: string | null }) => useOptions(url),
      { initialProps: { url: '/api/makes/ford/models' as string | null } },
    );
    rerender({ url: null });
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(result.current).toEqual({ status: 'idle' });

    rerender({ url: '/api/makes/bmw/models' });
    unmount();
    expect(requests[1]!.signal.aborted).toBe(true);
  });
});
