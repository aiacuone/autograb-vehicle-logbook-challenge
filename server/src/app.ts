import type { VehicleData } from '@logbook/shared';
import express, { type Express } from 'express';
import type { Logger } from 'pino';
import { errorHandler } from './error-handler.js';
import { AppError } from './errors.js';
import { requestLogger } from './logger.js';
import { logbookRoutes } from './routes/logbooks.js';
import { vehicleRoutes } from './routes/vehicles.js';

export interface AppDependencies {
  vehicles: VehicleData;
  logger: Logger;
}

export function createApp({ vehicles, logger }: AppDependencies): Express {
  const app = express();

  app.use(requestLogger(logger));
  app.use('/api', vehicleRoutes(vehicles));
  app.use('/api', logbookRoutes(vehicles));
  // Anything under /api that no route answered
  app.use('/api', () => {
    throw new AppError('NOT_FOUND', 'That address does not exist.');
  });
  app.use(errorHandler);

  return app;
}
