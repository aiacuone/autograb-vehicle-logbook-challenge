import type { VehicleData } from '@logbook/shared';

// Object.hasOwn, so names such as "constructor" or "__proto__" are never found

/** The models for a make, or undefined if the make does not exist. */
export function findModels(vehicles: VehicleData, make: string) {
  return Object.hasOwn(vehicles, make) ? vehicles[make] : undefined;
}

/** The badges for a model of a make, or undefined if either does not exist. */
export function findBadges(vehicles: VehicleData, make: string, model: string) {
  const models = findModels(vehicles, make);
  return models && Object.hasOwn(models, model) ? models[model] : undefined;
}
