import { useEffect, useState } from 'react';

/** Where one dropdown's option list is up to. */
export type OptionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; options: string[] }
  | { status: 'failed' };

const idle: OptionsState = { status: 'idle' };
const loading: OptionsState = { status: 'loading' };

async function fetchOptions(
  url: string,
  signal: AbortSignal,
): Promise<string[]> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  // The shared types are trusted here, as decided in ADR 0003
  return (await response.json()) as string[];
}

/**
 * Loads the option list at `url`, or nothing while `url` is null.
 *
 * When `url` changes, the previous request is aborted and its reply is ignored even
 * if it still arrives, so an old list can never overwrite a newer one. Each result is
 * stored with the url it belongs to, so a new url reads as loading straight away
 * rather than showing the previous list for one render.
 */
export function useOptions(url: string | null): OptionsState {
  const [result, setResult] = useState<{
    url: string;
    state: OptionsState;
  } | null>(null);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetchOptions(url, controller.signal).then(
      (options) => {
        if (!controller.signal.aborted)
          setResult({ url, state: { status: 'loaded', options } });
      },
      () => {
        if (!controller.signal.aborted)
          setResult({ url, state: { status: 'failed' } });
      },
    );
    return () => controller.abort();
  }, [url]);

  if (!url) return idle;
  if (result?.url !== url) return loading;
  return result.state;
}
