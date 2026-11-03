import { fileURLToPath } from 'node:url';
import {
  makeDisplayNames,
  quickSelectVehicles,
  vehicleLabel,
} from '@logbook/shared';
import { describe, expect, it } from 'vitest';
import { findBadges } from './vehicle-lookup.js';
import {
  VehicleDataError,
  loadVehicleData,
  parseVehicleData,
} from './vehicles.js';

const realFile = fileURLToPath(
  new URL('../data/vehicles.json', import.meta.url),
);

describe('the real vehicle data file', () => {
  it('passes the schema', () => {
    const data = loadVehicleData(realFile);
    expect(Object.keys(data).sort()).toEqual(['bmw', 'ford', 'tesla']);
    expect(data.ford?.['Ranger']).toContain('Raptor');
  });
});

describe('the shared display data against the real vehicle data', () => {
  const data = loadVehicleData(realFile);

  it('has a display name for every make', () => {
    for (const make of Object.keys(data)) {
      expect(Object.hasOwn(makeDisplayNames, make), make).toBe(true);
    }
  });

  it.each(
    quickSelectVehicles.map((vehicle) => [vehicleLabel(vehicle), vehicle]),
  )('has the quick-select vehicle %s', (_label, { make, model, badge }) => {
    expect(findBadges(data, make, model)).toContain(badge);
  });
});

describe('parseVehicleData', () => {
  it('rejects text that is not JSON, and names the source', () => {
    expect(() => parseVehicleData('{ nope', 'test.json')).toThrow(
      VehicleDataError,
    );
    expect(() => parseVehicleData('{ nope', 'test.json')).toThrow(
      /test\.json is not valid JSON/,
    );
  });

  it('names the part of the data that is wrong', () => {
    const bad = JSON.stringify({ ford: { Ranger: [] } });
    expect(() => parseVehicleData(bad, 'test.json')).toThrow(/ford > Ranger/);
  });

  it('rejects data with no makes', () => {
    expect(() => parseVehicleData('{}', 'test.json')).toThrow(
      /at least one make/,
    );
  });
});

describe('loadVehicleData', () => {
  it('reports a missing file with its path', () => {
    expect(() => loadVehicleData('/no/such/vehicles.json')).toThrow(
      /Cannot read the vehicle data file \/no\/such\/vehicles\.json/,
    );
  });
});
