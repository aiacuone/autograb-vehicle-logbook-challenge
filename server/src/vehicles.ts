import { readFileSync } from 'node:fs';
import { vehicleDataSchema, type VehicleData } from '@logbook/shared';

export class VehicleDataError extends Error {}

/** Parses and checks vehicle data. The message names the part that is wrong. */
export function parseVehicleData(json: string, source: string): VehicleData {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new VehicleDataError(`${source} is not valid JSON: ${reason}`);
  }
  const result = vehicleDataSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(' > ') || 'data'}: ${issue.message}`)
      .join('; ');
    throw new VehicleDataError(
      `${source} is not valid vehicle data. ${problems}`,
    );
  }
  return result.data;
}

/** Reads the vehicle data file once. The server keeps the result in memory. */
export function loadVehicleData(path: string): VehicleData {
  let json: string;
  try {
    json = readFileSync(path, 'utf8');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new VehicleDataError(
      `Cannot read the vehicle data file ${path}: ${reason}`,
    );
  }
  return parseVehicleData(json, path);
}
