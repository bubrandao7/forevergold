import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/visual',
  timeout: 90000,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    launchOptions: { executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }
  },
  webServer: [
    { command: 'npx serve referencia -l 5000 --no-clipboard', url: 'http://127.0.0.1:5000/support.js', reuseExistingServer: true },
    { command: 'npm run build && npm run preview', url: 'http://127.0.0.1:4173/', reuseExistingServer: true, timeout: 120000 }
  ]
});
