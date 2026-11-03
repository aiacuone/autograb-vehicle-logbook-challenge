import { MAX_LOGBOOK_BYTES } from '@logbook/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

// A small copy of the vehicle data, so these tests do not depend on the server's file
const vehicles: Record<string, Record<string, string[]>> = {
  ford: { Ranger: ['Raptor', 'Wildtrak'], 'Falcon Ute': ['XR6'] },
  bmw: { '130d': ['xDrive 26d'] },
  tesla: { 'Model 3': ['Performance', 'Long Range'] },
};

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

/** A fake server answering the three dropdown endpoints from the data above. */
function fakeServer(url: string) {
  const parts = url.split('/').map(decodeURIComponent);
  // ['', 'api', 'makes', make?, 'models', model?, 'badges']
  const [, , , make, , model] = parts;
  if (url === '/api/makes') return json(Object.keys(vehicles));
  const models = make ? vehicles[make] : undefined;
  if (!models) return json({ code: 'NOT_FOUND', message: 'No make' }, 404);
  if (url.endsWith('/models')) return json(Object.keys(models));
  const badges = model ? models[model] : undefined;
  if (!badges) return json({ code: 'NOT_FOUND', message: 'No model' }, 404);
  return json(badges);
}

/** The upload endpoint: replies with the vehicle that was sent, and the logbook's text. */
function fakeUpload(body: FormData) {
  return json({
    make: body.get('make'),
    model: body.get('model'),
    badge: body.get('badge'),
    logbook: 'trip log',
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn((url: string, init?: RequestInit) =>
    init?.method === 'POST'
      ? fakeUpload(init.body as FormData)
      : fakeServer(url),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Shows the router's current address, so a test can check where the app went. */
function Address() {
  return <span data-testid="address">{useLocation().pathname}</span>;
}

/** The app inside an in-memory router, starting at `path`. */
function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Address />
    </MemoryRouter>,
  );
}

const address = () => screen.getByTestId('address').textContent;

const dropdown = (name: string) => screen.getByRole('combobox', { name });

function optionNames(name: string) {
  return within(dropdown(name))
    .getAllByRole('option')
    .map((option) => option.textContent);
}

async function renderLoaded() {
  const user = userEvent.setup();
  renderApp();
  await waitFor(() => expect(dropdown('Make')).toBeEnabled());
  return user;
}

describe('the page', () => {
  it('has one main landmark with the app name as its heading', async () => {
    await renderLoaded();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Vehicle logbook' }),
    ).toBeInTheDocument();
  });

  it('shows the quick-select, vehicle and upload areas', async () => {
    await renderLoaded();
    expect(
      screen.getByRole('region', { name: 'Quick select' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('form', { name: 'Choose a vehicle' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Upload your logbook' }),
    ).toBeInTheDocument();
  });
});

describe('the make dropdown', () => {
  it('says the makes are loading in the dropdown, then shows them by display name', async () => {
    renderApp();
    expect(dropdown('Make')).toBeDisabled();
    expect(optionNames('Make')).toEqual(['Loading makes…']);

    await waitFor(() => expect(dropdown('Make')).toBeEnabled());
    expect(optionNames('Make')).toEqual([
      'Choose a make',
      'Ford',
      'BMW',
      'Tesla',
    ]);
  });

  it('shows the error in place of the hint when the makes cannot be loaded', async () => {
    fetchMock.mockImplementation(() => json({ code: 'INTERNAL_ERROR' }, 500));
    renderApp();
    const message =
      'The makes could not be loaded. Refresh the page to try again.';
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(dropdown('Make')).toBeDisabled();
    expect(dropdown('Make')).toHaveAttribute('aria-invalid', 'true');
    expect(dropdown('Make')).toHaveAccessibleDescription(message);
    expect(
      screen.queryByText('Choose a make to see its models.'),
    ).not.toBeInTheDocument();
  });
});

describe('the cascading dropdowns', () => {
  it('keeps model and badge disabled, and says why, until the choice above is made', async () => {
    await renderLoaded();
    expect(dropdown('Model')).toBeDisabled();
    expect(dropdown('Model')).toHaveAccessibleDescription(
      'Choose a make first.',
    );
    expect(dropdown('Badge')).toBeDisabled();
    expect(dropdown('Badge')).toHaveAccessibleDescription(
      'Choose a model first.',
    );
  });

  it('loads the models for a make, then the badges for a model', async () => {
    const user = await renderLoaded();
    await user.selectOptions(dropdown('Make'), 'ford');
    await waitFor(() => expect(dropdown('Model')).toBeEnabled());
    expect(optionNames('Model')).toEqual([
      'Choose a model',
      'Ranger',
      'Falcon Ute',
    ]);

    await user.selectOptions(dropdown('Model'), 'Falcon Ute');
    await waitFor(() => expect(dropdown('Badge')).toBeEnabled());
    expect(optionNames('Badge')).toEqual(['Choose a badge', 'XR6']);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/makes/ford/models/Falcon%20Ute/badges',
      expect.anything(),
    );
  });

  it('clears the model and badge when the make changes', async () => {
    const user = await renderLoaded();
    await user.selectOptions(dropdown('Make'), 'ford');
    await waitFor(() => expect(dropdown('Model')).toBeEnabled());
    await user.selectOptions(dropdown('Model'), 'Ranger');
    await waitFor(() => expect(dropdown('Badge')).toBeEnabled());
    await user.selectOptions(dropdown('Badge'), 'Raptor');

    await user.selectOptions(dropdown('Make'), 'bmw');
    expect(dropdown('Model')).toHaveValue('');
    expect(dropdown('Badge')).toHaveValue('');
    expect(dropdown('Badge')).toBeDisabled();
    await waitFor(() =>
      expect(optionNames('Model')).toEqual(['Choose a model', '130d']),
    );
  });

  it('clears the badge when the model changes', async () => {
    const user = await renderLoaded();
    await user.selectOptions(dropdown('Make'), 'ford');
    await waitFor(() => expect(dropdown('Model')).toBeEnabled());
    await user.selectOptions(dropdown('Model'), 'Ranger');
    await waitFor(() => expect(dropdown('Badge')).toBeEnabled());
    await user.selectOptions(dropdown('Badge'), 'Raptor');

    await user.selectOptions(dropdown('Model'), 'Falcon Ute');
    expect(dropdown('Badge')).toHaveValue('');
    await waitFor(() =>
      expect(optionNames('Badge')).toEqual(['Choose a badge', 'XR6']),
    );
  });

  it('clears everything below when the make is set back to the placeholder', async () => {
    const user = await renderLoaded();
    await user.selectOptions(dropdown('Make'), 'ford');
    await waitFor(() => expect(dropdown('Model')).toBeEnabled());

    await user.selectOptions(dropdown('Make'), '');
    expect(dropdown('Model')).toBeDisabled();
    expect(dropdown('Model')).toHaveAccessibleDescription(
      'Choose a make first.',
    );
  });

  it('shows the error under the model dropdown when the models cannot be loaded', async () => {
    const user = await renderLoaded();
    fetchMock.mockImplementation(() => json({ code: 'INTERNAL_ERROR' }, 500));
    await user.selectOptions(dropdown('Make'), 'ford');
    const message =
      'The models could not be loaded. Choose again, or refresh the page.';
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(dropdown('Model')).toHaveAccessibleDescription(message);
    expect(dropdown('Make')).not.toHaveAttribute('aria-invalid');
  });
});

describe('the quick-select buttons', () => {
  it.each([
    ['Ford Ranger Raptor', 'ford', 'Ranger', 'Raptor'],
    ['Tesla Model 3 Long Range', 'tesla', 'Model 3', 'Long Range'],
  ])('%s fills all three dropdowns', async (name, make, model, badge) => {
    const user = await renderLoaded();
    await user.click(screen.getByRole('button', { name }));

    await waitFor(() => expect(dropdown('Badge')).toBeEnabled());
    expect(dropdown('Make')).toHaveValue(make);
    expect(dropdown('Model')).toHaveValue(model);
    expect(dropdown('Badge')).toHaveValue(badge);
  });

  it('replaces an earlier choice of a different vehicle', async () => {
    const user = await renderLoaded();
    await user.selectOptions(dropdown('Make'), 'bmw');
    await waitFor(() => expect(dropdown('Model')).toBeEnabled());
    await user.selectOptions(dropdown('Model'), '130d');

    await user.click(
      screen.getByRole('button', { name: 'Tesla Model 3 Long Range' }),
    );
    await waitFor(() => expect(dropdown('Badge')).toBeEnabled());
    expect(dropdown('Make')).toHaveValue('tesla');
    expect(dropdown('Model')).toHaveValue('Model 3');
    expect(dropdown('Badge')).toHaveValue('Long Range');
  });
});

const logbook = new File(['trip log'], 'trip.txt', { type: 'text/plain' });
const uploadButton = () =>
  screen.getByRole('button', { name: /upload logbook|sending/i });
const fileInput = () => screen.getByLabelText('Logbook file');

/** Chooses Ford Ranger Raptor, so the file input appears. */
async function chooseVehicle(user: Awaited<ReturnType<typeof renderLoaded>>) {
  await user.click(screen.getByRole('button', { name: 'Ford Ranger Raptor' }));
  await waitFor(() => expect(dropdown('Badge')).toHaveValue('Raptor'));
}

const posts = () =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');

describe('the upload', () => {
  it('keeps the file input out of sight until a badge is chosen, with the button disabled until a file is chosen', async () => {
    const user = await renderLoaded();
    expect(fileInput()).not.toBeVisible();
    expect(uploadButton()).toBeDisabled();

    await chooseVehicle(user);
    expect(fileInput()).toBeVisible();
    expect(uploadButton()).toBeDisabled();

    await user.upload(fileInput(), logbook);
    expect(uploadButton()).toBeEnabled();
  });

  it('sends the vehicle and the file, and says the upload worked', async () => {
    const user = await renderLoaded();
    await chooseVehicle(user);
    await user.upload(fileInput(), logbook);
    await user.click(uploadButton());

    expect(
      await screen.findByRole('heading', { name: 'Your logbook' }),
    ).toBeInTheDocument();
    const body = posts()[0]![1].body as FormData;
    expect([body.get('make'), body.get('model'), body.get('badge')]).toEqual([
      'ford',
      'Ranger',
      'Raptor',
    ]);
    expect((body.get('logbook') as File).name).toBe('trip.txt');
  });

  it('blocks a file over 3 MB before anything is sent, and says why beside the input', async () => {
    const user = await renderLoaded();
    await chooseVehicle(user);
    const big = new File([new ArrayBuffer(MAX_LOGBOOK_BYTES + 1)], 'big.txt', {
      type: 'text/plain',
    });
    await user.upload(fileInput(), big);

    expect(screen.getByRole('alert')).toHaveTextContent('larger than 3 MB');
    expect(fileInput()).toHaveAccessibleDescription(/larger than 3 MB/);
    expect(uploadButton()).toBeDisabled();
    expect(posts()).toHaveLength(0);
  });

  it('accepts a file of exactly 3 MB', async () => {
    const user = await renderLoaded();
    await chooseVehicle(user);
    const exact = new File([new ArrayBuffer(MAX_LOGBOOK_BYTES)], 'exact.txt', {
      type: 'text/plain',
    });
    await user.upload(fileInput(), exact);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(uploadButton()).toBeEnabled();
  });

  it('shows a file error from the server beside the file input, and keeps the selections', async () => {
    const user = await renderLoaded();
    await chooseVehicle(user);
    await user.upload(fileInput(), logbook);
    fetchMock.mockImplementation(() =>
      json(
        {
          code: 'FILE_NOT_TEXT',
          message: 'Only plain text.',
          field: 'logbook',
        },
        400,
      ),
    );
    await user.click(uploadButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only plain text.',
    );
    expect(fileInput()).toHaveAccessibleDescription('Only plain text.');
    expect(dropdown('Make')).toHaveValue('ford');
    expect(dropdown('Model')).toHaveValue('Ranger');
    expect(dropdown('Badge')).toHaveValue('Raptor');
    expect(uploadButton()).toBeEnabled();
  });

  it('shows a field error from the server under the dropdown it names', async () => {
    const user = await renderLoaded();
    await chooseVehicle(user);
    await user.upload(fileInput(), logbook);
    fetchMock.mockImplementation(() =>
      json(
        {
          code: 'INVALID_FIELD',
          message: 'That badge does not belong to the model.',
          field: 'badge',
        },
        400,
      ),
    );
    await user.click(uploadButton());

    await screen.findByRole('alert');
    expect(dropdown('Badge')).toHaveAccessibleDescription(
      'That badge does not belong to the model.',
    );
    expect(dropdown('Badge')).toHaveAttribute('aria-invalid', 'true');
    expect(dropdown('Badge')).toHaveValue('Raptor');
    expect(fileInput()).not.toHaveAttribute('aria-invalid');
  });

  it('shows an error with no field in the message area', async () => {
    const user = await renderLoaded();
    await chooseVehicle(user);
    await user.upload(fileInput(), logbook);
    fetchMock.mockImplementation(() =>
      json(
        { code: 'RATE_LIMITED', message: 'Too many uploads. Try again soon.' },
        429,
      ),
    );
    await user.click(uploadButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many uploads. Try again soon.',
    );
    expect(dropdown('Badge')).not.toHaveAttribute('aria-invalid');
    expect(fileInput()).not.toHaveAttribute('aria-invalid');
  });

  it('shows a general error when the server cannot be reached', async () => {
    const user = await renderLoaded();
    await chooseVehicle(user);
    await user.upload(fileInput(), logbook);
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await user.click(uploadButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The logbook could not be sent',
    );
  });

  it('disables the button and says it is sending while the request is open', async () => {
    const user = await renderLoaded();
    await chooseVehicle(user);
    await user.upload(fileInput(), logbook);
    fetchMock.mockImplementation(() => new Promise(() => {}));
    await user.click(uploadButton());

    expect(uploadButton()).toBeDisabled();
    expect(uploadButton()).toHaveTextContent('Sending…');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sending your logbook…',
    );
  });

  it('ignores a late reply after the user changes a choice', async () => {
    const user = await renderLoaded();
    await chooseVehicle(user);
    await user.upload(fileInput(), logbook);
    let finish: (response: Response) => void = () => {};
    fetchMock.mockImplementation(
      () => new Promise<Response>((resolve) => (finish = resolve)),
    );
    await user.click(uploadButton());

    await user.selectOptions(dropdown('Badge'), 'Wildtrak');
    finish(
      new Response(
        JSON.stringify({
          make: 'ford',
          model: 'Ranger',
          badge: 'Raptor',
          logbook: 'x',
        }),
      ),
    );
    await waitFor(() =>
      expect(uploadButton()).toHaveTextContent('Upload logbook'),
    );
    expect(address()).toBe('/');
    expect(
      screen.queryByRole('heading', { name: 'Your logbook' }),
    ).not.toBeInTheDocument();
  });

  it('empties the file input when a new choice clears the file', async () => {
    const user = await renderLoaded();
    await chooseVehicle(user);
    await user.upload(fileInput(), logbook);

    await user.click(
      screen.getByRole('button', { name: 'Tesla Model 3 Long Range' }),
    );
    await waitFor(() => expect(dropdown('Badge')).toHaveValue('Long Range'));
    expect(fileInput()).toHaveValue('');
    expect(uploadButton()).toBeDisabled();
  });
});

describe('the result page', () => {
  async function upload(text = 'trip log') {
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? json({
            make: 'ford',
            model: 'Ranger',
            badge: 'Raptor',
            logbook: text,
          })
        : fakeServer(url),
    );
    const user = await renderLoaded();
    await chooseVehicle(user);
    await user.upload(fileInput(), logbook);
    await user.click(uploadButton());
    await screen.findByRole('heading', { name: 'Your logbook' });
    return user;
  }

  it('opens at /result after an upload, with focus on its heading', async () => {
    await upload();
    expect(address()).toBe('/result');
    expect(screen.getByRole('heading', { name: 'Your logbook' })).toHaveFocus();
  });

  it('shows the vehicle with the make display name, and the logbook', async () => {
    await upload('trip 1\nservice done');
    expect(screen.getByText('Ford')).toBeInTheDocument();
    expect(screen.getByText('Ranger')).toBeInTheDocument();
    expect(screen.getByText('Raptor')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Logbook' })).toHaveTextContent(
      'trip 1 service done',
    );
  });

  it('shows the logbook as plain text, never as HTML', async () => {
    const html = '<b>bold</b><img src=x onerror="alert(1)">';
    await upload(html);
    const region = screen.getByRole('region', { name: 'Logbook' });
    expect(region.textContent).toBe(html);
    expect(region.querySelector('b, img')).toBeNull();
  });

  it('goes back to the form with the vehicle kept and the file input empty', async () => {
    const user = await upload();
    await user.click(screen.getByRole('link', { name: 'Back to the form' }));

    expect(address()).toBe('/');
    await waitFor(() => expect(dropdown('Badge')).toHaveValue('Raptor'));
    expect(dropdown('Make')).toHaveValue('ford');
    expect(dropdown('Model')).toHaveValue('Ranger');
    expect(fileInput()).toHaveValue('');
    expect(uploadButton()).toBeDisabled();
  });

  it('does not load the dropdown lists again when going back', async () => {
    const user = await upload();
    const gets = () =>
      fetchMock.mock.calls.filter(([, init]) => init?.method !== 'POST').length;
    const before = gets();
    await user.click(screen.getByRole('link', { name: 'Back to the form' }));
    await waitFor(() => expect(dropdown('Badge')).toBeEnabled());
    expect(gets()).toBe(before);
  });
});

describe('addresses', () => {
  it('sends /result with no reply, such as after a refresh, to the form', async () => {
    renderApp('/result');
    expect(address()).toBe('/');
    expect(
      screen.getByRole('form', { name: 'Choose a vehicle' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(dropdown('Make')).toBeEnabled());
  });

  it('sends any unknown address to the form', async () => {
    renderApp('/no/such/page');
    expect(address()).toBe('/');
    await waitFor(() => expect(dropdown('Make')).toBeEnabled());
  });
});
