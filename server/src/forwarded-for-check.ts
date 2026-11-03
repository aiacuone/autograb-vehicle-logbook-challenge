import type { RequestHandler } from 'express';

/**
 * Warns once, as a JSON log line, when a request carries an X-Forwarded-For header
 * while no proxy is configured. The header is ignored either way. This replaces the
 * rate-limit library's own check, which prints a multi-line stack trace.
 */
export function forwardedForCheck(trustedProxyCount: number): RequestHandler {
  let warned = false;
  return (req, _res, next) => {
    if (!warned && trustedProxyCount === 0 && req.headers['x-forwarded-for']) {
      warned = true;
      req.log.warn(
        'A request carried an X-Forwarded-For header, but no proxy is configured, so the header is ignored. If the server runs behind a proxy, set TRUSTED_PROXY_COUNT.',
      );
    }
    next();
  };
}
