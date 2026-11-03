import { makeDisplayName } from '@logbook/shared';
import { useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router';
import type { SubmitStatus } from '../form/form-state';
import { paths } from '../paths';

interface ResultPageProps {
  submit: SubmitStatus;
}

/**
 * What the server sent back. The logbook is shown as text, never as HTML: React escapes
 * it, and <pre> keeps its line breaks. With no reply, after a refresh or a direct visit,
 * it sends the user to the form.
 */
export function ResultPage({ submit }: ResultPageProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  // Move focus to the new page's heading, so a screen reader starts reading there
  useEffect(() => {
    heading.current?.focus();
  }, []);

  if (submit.status !== 'succeeded') {
    return <Navigate to={paths.form} replace />;
  }
  const { make, model, badge, logbook } = submit.reply;

  return (
    <section aria-labelledby="result-heading" className="panel">
      <h2 id="result-heading" ref={heading} tabIndex={-1}>
        Your logbook
      </h2>
      <dl className="vehicle-summary">
        <dt>Make</dt>
        <dd>{makeDisplayName(make)}</dd>
        <dt>Model</dt>
        <dd>{model}</dd>
        <dt>Badge</dt>
        <dd>{badge}</dd>
      </dl>
      <h3 id="logbook-heading">Logbook</h3>
      {/* A region with a name and a tab stop, so a keyboard user can scroll a long logbook */}
      <pre
        className="logbook-text"
        role="region"
        aria-labelledby="logbook-heading"
        tabIndex={0}
      >
        {logbook}
      </pre>
      <p>
        <Link to={paths.form}>Back to the form</Link>
      </p>
    </section>
  );
}
