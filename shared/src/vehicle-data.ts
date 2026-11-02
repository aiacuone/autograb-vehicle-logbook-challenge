import { z } from 'zod';

const badges = z
  .array(z.string().min(1))
  .min(1, 'a model needs at least one badge');

const models = z
  .record(z.string().min(1), badges)
  .refine(
    (value) => Object.keys(value).length > 0,
    'a make needs at least one model',
  );

/** Make, then model, then the badges for that model. */
export const vehicleDataSchema = z
  .record(z.string().min(1), models)
  .refine(
    (value) => Object.keys(value).length > 0,
    'at least one make is required',
  );

export type VehicleData = z.infer<typeof vehicleDataSchema>;
