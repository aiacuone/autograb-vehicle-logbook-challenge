import { APP_NAME } from '@logbook/shared';
import { useReducer } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useVehicleOptions } from './api/use-vehicle-options';
import { Layout } from './components/Layout';
import { formReducer, initialFormState } from './form/form-state';
import { FormPage } from './pages/FormPage';
import { ResultPage } from './pages/ResultPage';
import { paths } from './paths';

/**
 * The form's state and its option lists live here, above the routes, so going to the
 * result page and back keeps the choices and does not load the lists again.
 */
export function App() {
  const [form, dispatch] = useReducer(formReducer, initialFormState);
  const options = useVehicleOptions(form);

  return (
    <Layout>
      <h1>{APP_NAME}</h1>
      <Routes>
        <Route
          path={paths.form}
          element={
            <FormPage form={form} dispatch={dispatch} options={options} />
          }
        />
        <Route
          path={paths.result}
          element={<ResultPage submit={form.submit} />}
        />
        {/* Any other address goes to the form */}
        <Route path="*" element={<Navigate to={paths.form} replace />} />
      </Routes>
    </Layout>
  );
}
