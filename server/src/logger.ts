import { randomUUID } from 'node:crypto';
import { pino, type DestinationStream, type Logger } from 'pino';
import { pinoHttp } from 'pino-http';

/**
 * One JSON line per event, to standard output. Cookies and authorisation headers are
 * redacted, and request bodies are never logged, so an uploaded logbook cannot appear.
 */
export function createLogger(
  level: string,
  destination?: DestinationStream,
): Logger {
  return pino(
    {
      level,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        censor: '[redacted]',
      },
    },
    destination,
  );
}

/** Logs one line for each finished request, with an id that links it to any error line. */
export function requestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: () => randomUUID(),
    // Server failures are errors and refused requests are warnings, so both stand out
    customLogLevel: (_req, res, error) =>
      error || res.statusCode >= 500
        ? 'error'
        : res.statusCode >= 400
          ? 'warn'
          : 'info',
  });
}
