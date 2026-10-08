import { defineConfig } from '@playwright/test';

/* Testes de browser do modo servidor, contra o Supabase falso (tests/e2e/supabase-falso.mjs). Ver README. */
export default defineConfig({
  testDir: 'tests/servidor',
  timeout: 120000,
  workers: 1,
  expect: { timeout: 8000 },
  reporter: [['list']],
  outputDir: 'test-results-servidor',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    actionTimeout: 8000,
    serviceWorkers: 'block',
    launchOptions: { executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }
  },
  webServer: [
    { command: 'node --experimental-strip-types --no-warnings tests/e2e/servidor-dev.mjs', url: 'http://127.0.0.1:3110/__test/ficheiros', reuseExistingServer: true, timeout: 60000 },
    { command: 'node tests/e2e/build-servidor.mjs && npx vite preview --outDir dist-servidor --host 127.0.0.1 --port 4174', url: 'http://127.0.0.1:4174/', reuseExistingServer: true, timeout: 180000 }
  ]
});
