import {
  APP_NAME,
  makeDisplayName,
  quickSelectVehicles,
  vehicleLabel,
} from '@logbook/shared';
import { useReducer, type FormEvent } from 'react';
import { submitLogbook } from './api/submit-logbook';
import { badgesUrl, makesUrl, modelsUrl } from './api/urls';
import { useOptions } from './api/use-options';
import { Layout } from './components/Layout';
import { LogbookUpload } from './components/LogbookUpload';
import { OptionSelect } from './components/OptionSelect';
import { Status } from './components/Status';
import {
  formReducer,
  initialFormState,
  isReadyToSubmit,
} from './form/form-state';

const chooseAgain = 'Choose again, or refresh the page.';

export function App() {
  const [form, dispatch] = useReducer(formReducer, initialFormState);

  // Each list's url is null until its parent is chosen, so a cleared parent stops its request
  const makes = useOptions(makesUrl);
  const models = useOptions(form.make ? modelsUrl(form.make) : null);
  const badges = useOptions(
    form.make && form.model ? badgesUrl(form.make, form.model) : null,
  );

  const sending = form.submit.status === 'sending';
  // A server error belongs beside the input it names. One with no field goes in the message area.
  const serverError =
    form.submit.status === 'failed' ? form.submit.error : null;
  const errorFor = (field: string) =>
    serverError?.field === field ? serverError.message : undefined;
  const generalError =
    serverError &&
    !['make', 'model', 'badge', 'logbook'].includes(serverError.field ?? '')
      ? serverError.message
      : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isReadyToSubmit(form) || sending) return;
    const { make, model, badge, file } = form;
    dispatch({ type: 'submitStarted' });
    const result = await submitLogbook({ make, model, badge }, file);
    // A choice made while sending resets the status, and the reducer then ignores this reply
    dispatch(
      result.ok
        ? { type: 'submitSucceeded', reply: result.reply }
        : { type: 'submitFailed', error: result.error },
    );
  }

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

      <form
        aria-labelledby="vehicle-heading"
        className="panel"
        noValidate
        onSubmit={submit}
      >
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
          error={errorFor('make')}
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
          error={errorFor('model')}
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
          error={errorFor('badge')}
          onChange={(badge) => dispatch({ type: 'badgeChosen', badge })}
        />

        <section aria-labelledby="upload-heading" className="upload">
          <h2 id="upload-heading">Upload your logbook</h2>
          <p className="hint">
            Choose a make, model and badge first, then upload a plain text file.
          </p>
          {/* Always in the page, so choosing a badge never moves the button. Until then it is
              invisible and inert, so it cannot be seen, focused or read out. The key empties
              the input whenever the state clears the file (a new model, or no badge). */}
          <div
            style={form.badge ? undefined : { visibility: 'hidden' }}
            inert={!form.badge}
          >
            <LogbookUpload
              key={`${form.make}/${form.model}/${form.badge ? 'badge' : 'none'}`}
              error={errorFor('logbook')}
              onChange={(file) => dispatch({ type: 'fileChosen', file })}
            />
          </div>
          <button type="submit" disabled={!isReadyToSubmit(form) || sending}>
            {sending ? 'Sending…' : 'Upload logbook'}
          </button>
        </section>

        <div className="messages">
          {sending ? (
            <Status kind="loading">Sending your logbook…</Status>
          ) : null}
          {generalError ? <Status kind="error">{generalError}</Status> : null}
          {/* Stand-in until #11 shows the result page */}
          {form.submit.status === 'succeeded' ? (
            <p className="status" role="status">
              Uploaded. The result page comes in a later step.
            </p>
          ) : null}
        </div>
      </form>
    </Layout>
  );
}
