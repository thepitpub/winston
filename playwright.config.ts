import { defineConfig } from '@playwright/test'

/** E2E no Chrome instalado, contra o servidor de dev em 127.0.0.1:3300 (npm run dev). */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3300', channel: 'chrome', headless: true, reducedMotion: 'reduce' },
  webServer: { command: 'npm run dev', url: 'http://localhost:3300/login', reuseExistingServer: true, timeout: 120_000 },
})
