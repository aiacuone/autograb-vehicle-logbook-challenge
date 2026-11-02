import { describe, expect, it } from 'vitest';
import {
  errorResponseSchema,
  submitFieldsSchema,
  submitResponseSchema,
  vehicleDataSchema,
} from './index.js';

describe('vehicleDataSchema', () => {
  it('accepts make, then model, then badges', () => {
    const data = { ford: { Ranger: ['Raptor', 'Wildtrak'] } };
    expect(vehicleDataSchema.parse(data)).toEqual(data);
  });

  it('rejects data with no makes', () => {
    expect(vehicleDataSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a make with no models', () => {
    expect(vehicleDataSchema.safeParse({ ford: {} }).success).toBe(false);
  });

  it('rejects a model with no badges', () => {
    expect(vehicleDataSchema.safeParse({ ford: { Ranger: [] } }).success).toBe(
      false,
    );
  });

  it('rejects badges that are not text', () => {
    expect(vehicleDataSchema.safeParse({ ford: { Ranger: [1] } }).success).toBe(
      false,
    );
  });
});

describe('submit schemas', () => {
  it('requires a make, model and badge', () => {
    expect(
      submitFieldsSchema.safeParse({ make: 'ford', model: 'Ranger' }).success,
    ).toBe(false);
  });

  it('adds the logbook text to the reply', () => {
    const reply = {
      make: 'ford',
      model: 'Ranger',
      badge: 'Raptor',
      logbook: 'Oil change',
    };
    expect(submitResponseSchema.parse(reply)).toEqual(reply);
  });
});

describe('errorResponseSchema', () => {
  it('accepts a code and a message, with an optional field', () => {
    expect(
      errorResponseSchema.safeParse({
        code: 'FILE_TOO_LARGE',
        message: 'Too big',
      }).success,
    ).toBe(true);
    expect(
      errorResponseSchema.safeParse({
        code: 'INVALID_FIELD',
        message: 'Pick a badge',
        field: 'badge',
      }).success,
    ).toBe(true);
  });

  it('rejects a code that is not in the list', () => {
    expect(
      errorResponseSchema.safeParse({ code: 'SOMETHING_ELSE', message: 'x' })
        .success,
    ).toBe(false);
  });
});
