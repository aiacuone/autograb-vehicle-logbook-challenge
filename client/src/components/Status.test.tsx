import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Status } from './Status';

describe('Status', () => {
  it('announces loading politely, as a status', () => {
    render(<Status kind="loading">Loading…</Status>);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces an error urgently, as an alert', () => {
    render(<Status kind="error">Something went wrong.</Status>);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something went wrong.',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
