import type { ReactNode } from 'react';

/** The page frame: one centred column inside the main landmark. */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <main className="page">
      <div className="page-column">{children}</div>
    </main>
  );
}
