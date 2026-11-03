import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { ConfigError, loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { VehicleDataError, loadVehicleData } from './vehicles.js';

const vehicleDataPath = fileURLToPath(
  new URL('../data/vehicles.json', import.meta.url),
);

try {
  const config = loadConfig();
  const vehicles = loadVehicleData(vehicleDataPath);
  const logger = createLogger(config.logLevel);
  const app = createApp({ vehicles, logger });
  app.listen(config.port, () => {
    logger.info(
      { port: config.port, makes: Object.keys(vehicles).length },
      'Server listening',
    );
  });
} catch (error) {
  if (error instanceof ConfigError || error instanceof VehicleDataError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
