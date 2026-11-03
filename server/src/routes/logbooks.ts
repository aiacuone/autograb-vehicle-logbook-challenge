import {
  MAX_LOGBOOK_BYTES,
  submitFieldsSchema,
  type SubmitFields,
  type SubmitResponse,
  type VehicleData,
} from '@logbook/shared';
import { Router, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { AppError } from '../errors.js';
import { readLogbookText } from '../logbook-text.js';
import { findBadges, findModels } from '../vehicle-lookup.js';

// Held in memory only: nothing is written to disk. multer stops reading a file as
// soon as it passes the cap, and the other limits stop a form from using up memory.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_LOGBOOK_BYTES,
    files: 1,
    fields: 3,
    fieldSize: 1024,
    parts: 4,
  },
}).single('logbook');

function uploadError(error: unknown): AppError {
  if (error instanceof MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return new AppError(
          'FILE_TOO_LARGE',
          'The logbook file is larger than 3 MB.',
          'logbook',
        );
      case 'LIMIT_FILE_COUNT':
      case 'LIMIT_UNEXPECTED_FILE':
        return new AppError(
          'INVALID_FIELD',
          'Send one logbook file, in the logbook field.',
          'logbook',
        );
      default:
        return new AppError(
          'INVALID_FIELD',
          'The form has unexpected or oversized fields.',
        );
    }
  }
  // Anything else here means the multipart body itself could not be read
  return new AppError('INVALID_FIELD', 'The upload could not be read.');
}

const receiveUpload: RequestHandler = (req, res, next) => {
  upload(req, res, (error?: unknown) => {
    if (error) next(uploadError(error));
    else next();
  });
};

/** Checks the make, model and badge exist and belong together. Each failure names its field. */
function checkVehicle(body: unknown, vehicles: VehicleData): SubmitFields {
  const parsed = submitFieldsSchema.safeParse(body ?? {});
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? 'make');
    throw new AppError('INVALID_FIELD', `Choose a ${field}.`, field);
  }
  const { make, model, badge } = parsed.data;
  if (!findModels(vehicles, make)) {
    throw new AppError('INVALID_FIELD', 'That make does not exist.', 'make');
  }
  const badges = findBadges(vehicles, make, model);
  if (!badges) {
    throw new AppError(
      'INVALID_FIELD',
      'That model does not belong to the make.',
      'model',
    );
  }
  if (!badges.includes(badge)) {
    throw new AppError(
      'INVALID_FIELD',
      'That badge does not belong to the model.',
      'badge',
    );
  }
  return parsed.data;
}

/** Receives a vehicle and its logbook, and replies with both. Nothing is stored. */
export function logbookRoutes(
  vehicles: VehicleData,
  rateLimit: RequestHandler,
): Router {
  const router = Router();

  // The rate limit runs first, so a flood is refused before any file is read
  router.post('/logbooks', rateLimit, receiveUpload, (req, res) => {
    const vehicle = checkVehicle(req.body, vehicles);
    if (!req.file) {
      throw new AppError(
        'FILE_MISSING',
        'Choose a logbook file to upload.',
        'logbook',
      );
    }
    const reply: SubmitResponse = {
      ...vehicle,
      logbook: readLogbookText(req.file.buffer),
    };
    res.json(reply);
  });

  return router;
}
