import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
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
