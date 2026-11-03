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
  const app = createApp({ vehicles, logger, config });
  app.listen(config.port, () => {
    logger.info(
      { port: config.port, makes: Object.keys(vehicles).length },
      'Server listening',
    );
  });
} catch (error) {
  // A failure before the server starts is still one JSON line, at fatal level. The
  // configured log level may be the thing that failed, so this logger uses info.
  const startupLogger = createLogger('info');
  if (error instanceof ConfigError || error instanceof VehicleDataError) {
    startupLogger.fatal(error.message);
  } else {
    startupLogger.fatal({ err: error }, 'The server could not start');
  }
  process.exit(1);
}
