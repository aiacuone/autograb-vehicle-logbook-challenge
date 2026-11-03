import type { ErrorCode } from '@logbook/shared';

export const statusByCode: Record<ErrorCode, number> = {
  FILE_MISSING: 400,
  FILE_TOO_LARGE: 413,
  FILE_NOT_TEXT: 415,
  INVALID_FIELD: 400,
  RATE_LIMITED: 429,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

/** An error the client is meant to see: a stable code, a message and, optionally, the field. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly field: string | undefined;

  constructor(code: ErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.field = field;
  }

  get status(): number {
    return statusByCode[this.code];
  }
}
