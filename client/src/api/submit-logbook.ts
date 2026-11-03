import {
  errorResponseSchema,
  submitResponseSchema,
  type ErrorResponse,
  type SubmitResponse,
} from '@logbook/shared';

export type SubmitResult =
  { ok: true; reply: SubmitResponse } | { ok: false; error: ErrorResponse };

/** Used when no reply from our server arrives, or the reply is not one of ours, such as a proxy's error page. */
const unreachable: ErrorResponse = {
  code: 'INTERNAL_ERROR',
  message:
    'The logbook could not be sent. Check your connection and try again.',
};

/**
 * Sends the vehicle and the logbook as one multipart request. Never throws: every outcome
 * comes back as a result, so the caller has one place to handle a failure.
 */
export async function submitLogbook(
  vehicle: { make: string; model: string; badge: string },
  file: File,
): Promise<SubmitResult> {
  const body = new FormData();
  body.append('make', vehicle.make);
  body.append('model', vehicle.model);
  body.append('badge', vehicle.badge);
  body.append('logbook', file);

  try {
    // No Content-Type header: the browser adds it, with the boundary the server needs
    const response = await fetch('/api/logbooks', { method: 'POST', body });
    const json: unknown = await response.json();
    if (response.ok) {
      const reply = submitResponseSchema.safeParse(json);
      return reply.success
        ? { ok: true, reply: reply.data }
        : { ok: false, error: unreachable };
    }
    const error = errorResponseSchema.safeParse(json);
    return { ok: false, error: error.success ? error.data : unreachable };
  } catch {
    return { ok: false, error: unreachable };
  }
}
