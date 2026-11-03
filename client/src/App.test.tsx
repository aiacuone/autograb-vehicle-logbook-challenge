import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('the page', () => {
  it('has one main landmark with the app name as its heading', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Vehicle logbook' }),
    ).toBeInTheDocument();
  });

  it('shows the quick-select, vehicle and upload areas', () => {
    render(<App />);
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

  it('shows the make, model and badge dropdowns with their labels', () => {
    render(<App />);
    for (const name of ['Make', 'Model', 'Badge']) {
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument();
    }
  });

  it('disables the dropdowns and says why, in a hint the dropdown is described by', () => {
    render(<App />);
    expect(screen.getByRole('combobox', { name: 'Model' })).toBeDisabled();
    expect(
      screen.getByRole('combobox', { name: 'Model' }),
    ).toHaveAccessibleDescription('Choose a make first.');
    expect(
      screen.getByRole('combobox', { name: 'Badge' }),
    ).toHaveAccessibleDescription('Choose a model first.');
  });
});

describe('the page-wide message', () => {
  it('shows nothing when there is no loading or error state', () => {
    render(<App />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a loading state as a status', () => {
    render(<App status={{ kind: 'loading', message: 'Loading the makes…' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading the makes…');
  });

  it('shows an error as an alert', () => {
    render(
      <App
        status={{ kind: 'error', message: 'The makes could not be loaded.' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The makes could not be loaded.',
    );
  });
});
