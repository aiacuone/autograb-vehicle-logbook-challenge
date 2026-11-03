import type { Server } from 'node:http';
import type { Express } from 'express';
import type { Logger } from 'pino';

/**
 * Starts listening. Express 5 passes a failure, such as a port that is already in use,
 * to the callback instead of throwing, so the callback must check for it. Without the
 * check the failure is logged as success and the process quietly exits.
 */
export function listen(
  app: Express,
  port: number,
  logger: Logger,
  onFailure: (code: number) => void = process.exit,
  info: Record<string, unknown> = {},
): Server {
  return app.listen(port, (error?: Error) => {
    if (error) {
      if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        // The cause is known, so a short line says more than a stack trace would
        logger.fatal(
          { port, code: 'EADDRINUSE' },
          `Port ${port} is already in use. Stop the other program or set PORT to a free port.`,
        );
      } else {
        logger.fatal(
          { err: error, port },
          'The server could not start listening',
        );
      }
      onFailure(1);
      return;
    }
    logger.info({ port, ...info }, 'Server listening');
  });
}
