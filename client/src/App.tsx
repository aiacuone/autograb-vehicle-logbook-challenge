import { APP_NAME } from '@logbook/shared';
import { Field } from './components/Field';
import { Layout } from './components/Layout';
import { Status } from './components/Status';

export interface PageStatus {
  kind: 'loading' | 'error';
  message: string;
}

interface AppProps {
  /** A page-wide loading or error message. Nothing is shown when it is not set. */
  status?: PageStatus;
}

export function App({ status }: AppProps) {
  return (
    <Layout>
      <h1>{APP_NAME}</h1>

      <section aria-labelledby="quick-select-heading" className="panel">
        <h2 id="quick-select-heading">Quick select</h2>
        <p className="hint">Common vehicles will appear here.</p>
      </section>

      <form aria-labelledby="vehicle-heading" className="panel" noValidate>
        <h2 id="vehicle-heading">Choose a vehicle</h2>
        <Field id="make" label="Make" hint="Choose a make to see its models.">
          {(control) => (
            <select {...control} disabled>
              <option>Choose a make</option>
            </select>
          )}
        </Field>
        <Field id="model" label="Model" hint="Choose a make first.">
          {(control) => (
            <select {...control} disabled>
              <option>Choose a model</option>
            </select>
          )}
        </Field>
        <Field id="badge" label="Badge" hint="Choose a model first.">
          {(control) => (
            <select {...control} disabled>
              <option>Choose a badge</option>
            </select>
          )}
        </Field>

        <section aria-labelledby="upload-heading" className="upload">
          <h2 id="upload-heading">Upload your logbook</h2>
          <p className="hint">
            Choose a make, model and badge first, then upload a plain text file.
          </p>
        </section>

        <div className="messages">
          {status ? <Status kind={status.kind}>{status.message}</Status> : null}
        </div>
      </form>
    </Layout>
  );
}
