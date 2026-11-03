import { defineConfig } from 'vitest/config';

// Each workspace has its own config, so the client can run in a browser-like environment
export default defineConfig({
  test: {
    projects: ['shared', 'server', 'client'],
  },
});
