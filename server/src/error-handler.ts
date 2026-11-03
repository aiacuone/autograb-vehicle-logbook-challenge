import type { ErrorResponse } from '@logbook/shared';
import type { ErrorRequestHandler } from 'express';
import { AppError } from './errors.js';

/**
 * The one place that turns an error into a reply. Known errors keep their code and
 * message. Anything else is logged in full and answered with a generic message, so
 * no stack trace, file path or library name reaches the client.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof AppError) {
    const body: ErrorResponse = {
      code: error.code,
      message: error.message,
      ...(error.field ? { field: error.field } : {}),
    };
    res.status(error.status).json(body);
    return;
  }
  req.log.error({ err: error }, 'Unexpected error');
  const body: ErrorResponse = {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong. Please try again.',
  };
  res.status(500).json(body);
};
