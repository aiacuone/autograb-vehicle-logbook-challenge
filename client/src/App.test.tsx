import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(fakeServer);
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const dropdown = (name: string) => screen.getByRole('combobox', { name });

function optionNames(name: string) {
  return within(dropdown(name))
    .getAllByRole('option')
    .map((option) => option.textContent);
}

async function renderLoaded() {
  const user = userEvent.setup();
  render(<App />);
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
    render(<App />);
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
    render(<App />);
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
