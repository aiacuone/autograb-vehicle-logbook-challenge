import type { ReactNode } from 'react';

interface StatusProps {
  kind: 'loading' | 'error';
  children: ReactNode;
}

/**
 * A message for the whole page. Loading is announced politely and an error urgently,
 * because a screen reader reads a status or an alert when it appears.
 */
export function Status({ kind, children }: StatusProps) {
  return (
    <p
      className={`status status-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}
