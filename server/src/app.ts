import type { VehicleData } from '@logbook/shared';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { clientFiles } from './client-files.js';
import type { Config } from './config.js';
import { errorHandler } from './error-handler.js';
import { AppError } from './errors.js';
import { forwardedForCheck } from './forwarded-for-check.js';
import { requestLogger } from './logger.js';
import { uploadRateLimit } from './rate-limit.js';
import { logbookRoutes } from './routes/logbooks.js';
import { vehicleRoutes } from './routes/vehicles.js';

export interface AppDependencies {
  vehicles: VehicleData;
  logger: Logger;
  config: Pick<
    Config,
    'trustedProxyCount' | 'rateLimitWindowMs' | 'rateLimitMax' | 'clientDir'
  >;
}

export function createApp({
  vehicles,
  logger,
  config,
}: AppDependencies): Express {
  const app = express();

  // With no proxy, the visitor's address is the connection's own, and any
  // X-Forwarded-For header is ignored. Behind proxies, trust exactly that many hops.
  app.set(
    'trust proxy',
    config.trustedProxyCount > 0 ? config.trustedProxyCount : false,
  );

  // Security headers, including a content policy. Also removes X-Powered-By. No
  // cross-origin headers are ever sent, so browsers block other sites from reading the API.
  // upgrade-insecure-requests is removed because the app is served over plain HTTP:
  // opened at an address other than localhost, it would make the page's own scripts fail.
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
    }),
  );
  app.use(requestLogger(logger));
  app.use(forwardedForCheck(config.trustedProxyCount));
  app.use('/api', vehicleRoutes(vehicles));
  app.use('/api', logbookRoutes(vehicles, uploadRateLimit(config)));
  // Anything under /api that no route answered
  app.use('/api', () => {
    throw new AppError('NOT_FOUND', 'That address does not exist.');
  });
  // After the API, so an /api address is never answered with the app's page
  const client = clientFiles(config.clientDir);
  if (client) app.use(client);
  else
    logger.info(
      { clientDir: config.clientDir },
      'No client build found, serving the API only',
    );
  app.use(errorHandler);

  return app;
}
