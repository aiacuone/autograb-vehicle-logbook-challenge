import type { VehicleData } from '@logbook/shared';
import { Router } from 'express';
import { AppError } from '../errors.js';

function modelsOf(vehicles: VehicleData, make: string) {
  // hasOwn, so a make called "constructor" or "__proto__" is not found
  if (!Object.hasOwn(vehicles, make)) {
    throw new AppError('NOT_FOUND', 'That make does not exist.', 'make');
  }
  return vehicles[make]!;
}

function badgesOf(vehicles: VehicleData, make: string, model: string) {
  const models = modelsOf(vehicles, make);
  if (!Object.hasOwn(models, model)) {
    throw new AppError('NOT_FOUND', 'That model does not exist.', 'model');
  }
  return models[model]!;
}

/** The three lists behind the dropdowns: makes, models for a make, badges for a model. */
export function vehicleRoutes(vehicles: VehicleData): Router {
  const router = Router();

  router.get('/makes', (_req, res) => {
    res.json(Object.keys(vehicles));
  });

  router.get('/makes/:make/models', (req, res) => {
    res.json(Object.keys(modelsOf(vehicles, req.params.make)));
  });

  router.get('/makes/:make/models/:model/badges', (req, res) => {
    res.json(badgesOf(vehicles, req.params.make, req.params.model));
  });

  return router;
}
