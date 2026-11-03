import type { ErrorResponse, SubmitResponse } from '@logbook/shared';
import { describe, expect, it } from 'vitest';
import {
  formReducer,
  initialFormState,
  isReadyToSubmit,
  type FormAction,
  type FormState,
} from './form-state';

const logbook = new File(['Oil changed'], 'logbook.txt', {
  type: 'text/plain',
});
const otherFile = new File(['Brakes'], 'other.txt', { type: 'text/plain' });
const reply: SubmitResponse = {
  make: 'ford',
  model: 'Ranger',
  badge: 'Raptor',
  logbook: 'Oil changed',
};
const error: ErrorResponse = {
  code: 'FILE_NOT_TEXT',
  message: 'Only plain text.',
  field: 'logbook',
};

/** Applies actions in order, starting from the empty form. */
function after(...actions: FormAction[]): FormState {
  return actions.reduce(formReducer, initialFormState);
}

const rangerRaptor: FormAction[] = [
  { type: 'makeChosen', make: 'ford' },
  { type: 'modelChosen', model: 'Ranger' },
  { type: 'badgeChosen', badge: 'Raptor' },
];
const withFile: FormAction[] = [
  ...rangerRaptor,
  { type: 'fileChosen', file: logbook },
];

describe('the empty form', () => {
  it('has nothing chosen and nothing sent', () => {
    expect(initialFormState).toEqual({
      make: null,
      model: null,
      badge: null,
      file: null,
      submit: { status: 'idle' },
    });
  });
});

describe('choosing a make', () => {
  it('sets the make', () => {
    expect(after({ type: 'makeChosen', make: 'ford' }).make).toBe('ford');
  });

  it('clears the model, badge and file when it changes', () => {
    const state = after(...withFile, { type: 'makeChosen', make: 'bmw' });
    expect(state).toEqual({ ...initialFormState, make: 'bmw' });
  });

  it('changes nothing when the same make is chosen again', () => {
    const before = after(...withFile);
    expect(formReducer(before, { type: 'makeChosen', make: 'ford' })).toBe(
      before,
    );
  });

  it('clears everything when the make is cleared', () => {
    expect(after(...withFile, { type: 'makeChosen', make: null })).toEqual(
      initialFormState,
    );
  });
});

describe('choosing a model', () => {
  it('sets the model', () => {
    expect(after(...rangerRaptor.slice(0, 2)).model).toBe('Ranger');
  });

  it('clears the badge and file when it changes, and keeps the make', () => {
    const state = after(...withFile, { type: 'modelChosen', model: 'Falcon' });
    expect(state).toMatchObject({
      make: 'ford',
      model: 'Falcon',
      badge: null,
      file: null,
    });
  });

  it('is ignored before a make is chosen', () => {
    expect(after({ type: 'modelChosen', model: 'Ranger' })).toEqual(
      initialFormState,
    );
  });

  it('changes nothing when the same model is chosen again', () => {
    const before = after(...withFile);
    expect(formReducer(before, { type: 'modelChosen', model: 'Ranger' })).toBe(
      before,
    );
  });
});

describe('choosing a badge', () => {
  it('sets the badge', () => {
    expect(after(...rangerRaptor).badge).toBe('Raptor');
  });

  it('keeps the file when the badge changes', () => {
    const state = after(...withFile, {
      type: 'badgeChosen',
      badge: 'Wildtrak',
    });
    expect(state).toMatchObject({ badge: 'Wildtrak', file: logbook });
  });

  it('clears the file when the badge is cleared, since the file input is then hidden', () => {
    const state = after(...withFile, { type: 'badgeChosen', badge: null });
    expect(state).toMatchObject({ badge: null, file: null });
  });

  it('is ignored before a model is chosen', () => {
    const state = after(
      { type: 'makeChosen', make: 'ford' },
      { type: 'badgeChosen', badge: 'Raptor' },
    );
    expect(state.badge).toBeNull();
  });
});

describe('quick-select', () => {
  const tesla: FormAction = {
    type: 'vehicleChosen',
    make: 'tesla',
    model: 'Model 3',
    badge: 'Long Range',
  };

  it('fills all three choices from an empty form', () => {
    expect(after(tesla)).toMatchObject({
      make: 'tesla',
      model: 'Model 3',
      badge: 'Long Range',
    });
  });

  it('replaces another vehicle and clears its file', () => {
    expect(after(...withFile, tesla)).toEqual({
      make: 'tesla',
      model: 'Model 3',
      badge: 'Long Range',
      file: null,
      submit: { status: 'idle' },
    });
  });

  it('keeps the file when only the badge changes', () => {
    const state = after(...withFile, {
      type: 'vehicleChosen',
      make: 'ford',
      model: 'Ranger',
      badge: 'Wildtrak',
    });
    expect(state).toMatchObject({ badge: 'Wildtrak', file: logbook });
  });

  it('changes nothing when the same vehicle is chosen again', () => {
    const before = after(...withFile);
    const same: FormAction = {
      type: 'vehicleChosen',
      make: 'ford',
      model: 'Ranger',
      badge: 'Raptor',
    };
    expect(formReducer(before, same)).toBe(before);
  });
});

describe('choosing a file', () => {
  it('sets the file once a badge is chosen', () => {
    expect(after(...withFile).file).toBe(logbook);
  });

  it('replaces the file', () => {
    expect(
      after(...withFile, { type: 'fileChosen', file: otherFile }).file,
    ).toBe(otherFile);
  });

  it('clears the file', () => {
    expect(
      after(...withFile, { type: 'fileChosen', file: null }).file,
    ).toBeNull();
  });

  it('is ignored before a badge is chosen', () => {
    const state = after(...rangerRaptor.slice(0, 2), {
      type: 'fileChosen',
      file: logbook,
    });
    expect(state.file).toBeNull();
  });
});

describe('submitting', () => {
  it('is ready only when the make, model, badge and file are all chosen', () => {
    expect(isReadyToSubmit(after(...rangerRaptor))).toBe(false);
    expect(isReadyToSubmit(after(...withFile))).toBe(true);
  });

  it('starts sending when ready', () => {
    expect(after(...withFile, { type: 'submitStarted' }).submit).toEqual({
      status: 'sending',
    });
  });

  it('is ignored when not ready', () => {
    expect(after(...rangerRaptor, { type: 'submitStarted' }).submit).toEqual({
      status: 'idle',
    });
  });

  it('is ignored while already sending', () => {
    const sending = after(...withFile, { type: 'submitStarted' });
    expect(formReducer(sending, { type: 'submitStarted' })).toBe(sending);
  });

  it('holds the reply on success, keeps the vehicle for Back, and lets go of the file', () => {
    const state = after(
      ...withFile,
      { type: 'submitStarted' },
      { type: 'submitSucceeded', reply },
    );
    expect(state.submit).toEqual({ status: 'succeeded', reply });
    expect([state.make, state.model, state.badge]).toEqual([
      'ford',
      'Ranger',
      'Raptor',
    ]);
    expect(state.file).toBeNull();
  });

  it('holds the error on failure, and keeps the choices', () => {
    const state = after(
      ...withFile,
      { type: 'submitStarted' },
      { type: 'submitFailed', error },
    );
    expect(state).toMatchObject({
      make: 'ford',
      badge: 'Raptor',
      file: logbook,
    });
    expect(state.submit).toEqual({ status: 'failed', error });
  });

  it('clears an error as soon as a choice changes', () => {
    const state = after(
      ...withFile,
      { type: 'submitStarted' },
      { type: 'submitFailed', error },
      { type: 'fileChosen', file: otherFile },
    );
    expect(state.submit).toEqual({ status: 'idle' });
  });

  it('ignores a reply that arrives after the choices changed', () => {
    const state = after(
      ...withFile,
      { type: 'submitStarted' },
      { type: 'makeChosen', make: 'bmw' },
      { type: 'submitSucceeded', reply },
    );
    expect(state).toEqual({ ...initialFormState, make: 'bmw' });
  });

  it('ignores a reply or error when nothing was sent', () => {
    const before = after(...withFile);
    expect(formReducer(before, { type: 'submitSucceeded', reply })).toBe(
      before,
    );
    expect(formReducer(before, { type: 'submitFailed', error })).toBe(before);
  });
});
