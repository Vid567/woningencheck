import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // golden-46.spec.mjs remains the immutable case-data source. The current runner
  // reads that full matrix and executes it against /adrescheck.html.
  testIgnore: ['**/golden-46.spec.mjs'],
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'],['html',{open:'never'}]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'mobile-chromium',use:{...devices['Pixel 5']}}
  ]
});
