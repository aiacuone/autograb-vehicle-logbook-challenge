import type { VehicleData } from '@logbook/shared';
import { Router } from 'express';
import { AppError } from '../errors.js';
import { findBadges, findModels } from '../vehicle-lookup.js';

/** The three lists behind the dropdowns: makes, models for a make, badges for a model. */
export function vehicleRoutes(vehicles: VehicleData): Router {
  const router = Router();

  router.get('/makes', (_req, res) => {
    res.json(Object.keys(vehicles));
  });

  router.get('/makes/:make/models', (req, res) => {
    const models = findModels(vehicles, req.params.make);
    if (!models)
      throw new AppError('NOT_FOUND', 'That make does not exist.', 'make');
    res.json(Object.keys(models));
  });

  router.get('/makes/:make/models/:model/badges', (req, res) => {
    const { make, model } = req.params;
    if (!findModels(vehicles, make)) {
      throw new AppError('NOT_FOUND', 'That make does not exist.', 'make');
    }
    const badges = findBadges(vehicles, make, model);
    if (!badges)
      throw new AppError('NOT_FOUND', 'That model does not exist.', 'model');
    res.json(badges);
  });

  return router;
}
