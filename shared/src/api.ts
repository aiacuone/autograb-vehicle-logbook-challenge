import { z } from 'zod';

export const makesResponseSchema = z.array(z.string());
export const modelsResponseSchema = z.array(z.string());
export const badgesResponseSchema = z.array(z.string());

export type MakesResponse = z.infer<typeof makesResponseSchema>;
export type ModelsResponse = z.infer<typeof modelsResponseSchema>;
export type BadgesResponse = z.infer<typeof badgesResponseSchema>;

/** The text fields of the form. The logbook file travels separately. */
export const submitFieldsSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  badge: z.string().min(1),
});

export const submitResponseSchema = submitFieldsSchema.extend({
  logbook: z.string(),
});

export type SubmitFields = z.infer<typeof submitFieldsSchema>;
export type SubmitResponse = z.infer<typeof submitResponseSchema>;

export const errorCodes = [
  'FILE_MISSING',
  'FILE_TOO_LARGE',
  'FILE_NOT_TEXT',
  'INVALID_FIELD',
  'RATE_LIMITED',
  'NOT_FOUND',
  'INTERNAL_ERROR',
] as const;

export const errorCodeSchema = z.enum(errorCodes);

/** Every error reply: a stable code, a message for the user, and the field it concerns. */
export const errorResponseSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  field: z.string().optional(),
});

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
