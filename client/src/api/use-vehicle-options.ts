import type { FormState } from '../form/form-state';
import { badgesUrl, makesUrl, modelsUrl } from './urls';
import { useOptions, type OptionsState } from './use-options';

export interface VehicleOptions {
  makes: OptionsState;
  models: OptionsState;
  badges: OptionsState;
}

/** The three dropdowns' lists. Each list's url is null until its parent is chosen, so a cleared parent stops its request. */
export function useVehicleOptions(
  form: Pick<FormState, 'make' | 'model'>,
): VehicleOptions {
  const makes = useOptions(makesUrl);
  const models = useOptions(form.make ? modelsUrl(form.make) : null);
  const badges = useOptions(
    form.make && form.model ? badgesUrl(form.make, form.model) : null,
  );
  return { makes, models, badges };
}
