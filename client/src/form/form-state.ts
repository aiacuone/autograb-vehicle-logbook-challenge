import type { ErrorResponse, SubmitResponse } from '@logbook/shared';

/** Where the upload is up to. Each status carries only the data that makes sense for it. */
export type SubmitStatus =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'succeeded'; reply: SubmitResponse }
  | { status: 'failed'; error: ErrorResponse };

export interface FormState {
  make: string | null;
  model: string | null;
  badge: string | null;
  file: File | null;
  submit: SubmitStatus;
}

/** Every change the form can make. A union, so a wrong action name or field does not compile. */
export type FormAction =
  | { type: 'makeChosen'; make: string | null }
  | { type: 'modelChosen'; model: string | null }
  | { type: 'badgeChosen'; badge: string | null }
  | { type: 'vehicleChosen'; make: string; model: string; badge: string }
  | { type: 'fileChosen'; file: File | null }
  | { type: 'submitStarted' }
  | { type: 'submitSucceeded'; reply: SubmitResponse }
  | { type: 'submitFailed'; error: ErrorResponse };

export const initialFormState: FormState = {
  make: null,
  model: null,
  badge: null,
  file: null,
  submit: { status: 'idle' },
};

const idle: SubmitStatus = { status: 'idle' };

/** A form with everything the upload needs chosen, so none of these can be null. */
export type ReadyFormState = FormState & {
  make: string;
  model: string;
  badge: string;
  file: File;
};

/** True when everything the upload needs has been chosen. As a type guard, it also tells the compiler so. */
export function isReadyToSubmit(state: FormState): state is ReadyFormState {
  return Boolean(state.make && state.model && state.badge && state.file);
}

/**
 * The form's rules in one place. Choosing a make clears the model, badge and file;
 * choosing a model clears the badge and file. A step that is not possible yet, such
 * as a badge with no model, is ignored, so the state can never hold a half-made vehicle.
 */
export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'makeChosen':
      if (action.make === state.make) return state;
      return { ...initialFormState, make: action.make };

    case 'modelChosen':
      if (!state.make || action.model === state.model) return state;
      return {
        ...state,
        model: action.model,
        badge: null,
        file: null,
        submit: idle,
      };

    case 'badgeChosen':
      if (!state.model || action.badge === state.badge) return state;
      // The file input is shown only while a badge is chosen, so clearing the badge clears the file
      return {
        ...state,
        badge: action.badge,
        file: action.badge ? state.file : null,
        submit: idle,
      };

    case 'vehicleChosen': {
      const sameVehicle =
        action.make === state.make &&
        action.model === state.model &&
        action.badge === state.badge;
      if (sameVehicle) return state;
      const sameModel =
        action.make === state.make && action.model === state.model;
      return {
        make: action.make,
        model: action.model,
        badge: action.badge,
        file: sameModel ? state.file : null,
        submit: idle,
      };
    }

    case 'fileChosen':
      if (!state.badge || action.file === state.file) return state;
      return { ...state, file: action.file, submit: idle };

    case 'submitStarted':
      if (!isReadyToSubmit(state) || state.submit.status === 'sending')
        return state;
      return { ...state, submit: { status: 'sending' } };

    case 'submitSucceeded':
      if (state.submit.status !== 'sending') return state;
      return { ...state, submit: { status: 'succeeded', reply: action.reply } };

    case 'submitFailed':
      if (state.submit.status !== 'sending') return state;
      return { ...state, submit: { status: 'failed', error: action.error } };
  }
}
