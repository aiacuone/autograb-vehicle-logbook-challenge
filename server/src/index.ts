import { fileURLToPath } from 'node:url';
import { ConfigError, loadConfig } from './config.js';
import { startMessage } from './start-message.js';
import { VehicleDataError, loadVehicleData } from './vehicles.js';

const vehicleDataPath = fileURLToPath(
  new URL('../data/vehicles.json', import.meta.url),
);

try {
  const config = loadConfig();
  const vehicles = loadVehicleData(vehicleDataPath);
  console.log(
    `${startMessage()}: ${Object.keys(vehicles).length} makes loaded, port ${config.port}`,
  );
} catch (error) {
  if (error instanceof ConfigError || error instanceof VehicleDataError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
