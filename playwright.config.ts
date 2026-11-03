import { defineConfig, devices } from '@playwright/test';

// The built app on its own port, 3100, so the test never touches a developer's
// servers on 3000 and 5173. One Express process serves both the page and the API.
const port = 3100;

export default defineConfig({
  testDir: 'e2e',
  // A flaky test is fixed or moved down to an integration test (ADR 0006), not retried
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm start -w @logbook/server',
    url: `http://localhost:${port}/api/makes`,
    env: { PORT: String(port), LOG_LEVEL: 'warn' },
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
