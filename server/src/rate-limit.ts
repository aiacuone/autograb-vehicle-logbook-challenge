import { rateLimit } from 'express-rate-limit';
import { AppError } from './errors.js';

export interface RateLimitSettings {
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

/**
 * Counts uploads per visitor address, in memory. Over the limit, the request goes to
 * the central error handler as RATE_LIMITED, so the reply is a 429 in the shared shape.
 * The counts reset when the server restarts and are not shared between server copies.
 */
export function uploadRateLimit({
  rateLimitWindowMs,
  rateLimitMax,
}: RateLimitSettings) {
  return rateLimit({
    windowMs: rateLimitWindowMs,
    limit: rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Replaced by forwardedForCheck, which logs one JSON line instead of a stack trace
    validate: { xForwardedForHeader: false },
    handler: (_req, _res, next) => {
      next(
        new AppError(
          'RATE_LIMITED',
          'Too many uploads. Please wait a moment and try again.',
        ),
      );
    },
  });
}
