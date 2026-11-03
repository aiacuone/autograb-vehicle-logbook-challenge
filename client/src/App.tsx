import {
  APP_NAME,
  makeDisplayName,
  quickSelectVehicles,
  vehicleLabel,
} from '@logbook/shared';
import { useReducer } from 'react';
import { badgesUrl, makesUrl, modelsUrl } from './api/urls';
import { useOptions } from './api/use-options';
import { Layout } from './components/Layout';
import { OptionSelect } from './components/OptionSelect';
import { formReducer, initialFormState } from './form/form-state';

const chooseAgain = 'Choose again, or refresh the page.';

export function App() {
  const [form, dispatch] = useReducer(formReducer, initialFormState);

  // Each list's url is null until its parent is chosen, so a cleared parent stops its request
  const makes = useOptions(makesUrl);
  const models = useOptions(form.make ? modelsUrl(form.make) : null);
  const badges = useOptions(
    form.make && form.model ? badgesUrl(form.make, form.model) : null,
  );

  return (
    <Layout>
      <h1>{APP_NAME}</h1>

      <section aria-labelledby="quick-select-heading" className="panel">
        <h2 id="quick-select-heading">Quick select</h2>
        <ul className="quick-select">
          {quickSelectVehicles.map((vehicle) => (
            <li key={vehicleLabel(vehicle)}>
              <button
                type="button"
                onClick={() => dispatch({ type: 'vehicleChosen', ...vehicle })}
              >
                {vehicleLabel(vehicle)}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <form aria-labelledby="vehicle-heading" className="panel" noValidate>
        <h2 id="vehicle-heading">Choose a vehicle</h2>
        <OptionSelect
          id="make"
          label="Make"
          noun="make"
          value={form.make}
          options={makes}
          optionLabel={makeDisplayName}
          hint="Choose a make to see its models."
          retryHint="Refresh the page to try again."
          onChange={(make) => dispatch({ type: 'makeChosen', make })}
        />
        <OptionSelect
          id="model"
          label="Model"
          noun="model"
          value={form.model}
          options={models}
          hint={
            form.make
              ? 'Choose a model to see its badges.'
              : 'Choose a make first.'
          }
          retryHint={chooseAgain}
          onChange={(model) => dispatch({ type: 'modelChosen', model })}
        />
        <OptionSelect
          id="badge"
          label="Badge"
          noun="badge"
          value={form.badge}
          options={badges}
          hint={form.model ? 'Choose a badge.' : 'Choose a model first.'}
          retryHint={chooseAgain}
          onChange={(badge) => dispatch({ type: 'badgeChosen', badge })}
        />

        <section aria-labelledby="upload-heading" className="upload">
          <h2 id="upload-heading">Upload your logbook</h2>
          <p className="hint">
            Choose a make, model and badge first, then upload a plain text file.
          </p>
        </section>
      </form>
    </Layout>
  );
}
