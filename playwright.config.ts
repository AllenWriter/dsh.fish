import { defineConfig } from '@playwright/test'
import { mobileProjects } from './e2e/lib/devices'

const PORT = 5173
const baseURL = `http://localhost:${PORT}`

/**
 * End-to-end coverage.
 *
 * Mobile markdown rendering on the plugin detail page, plus the catalog-card
 * Social preview treatment. One Chromium run, many device projects for the
 * readme: overflow, wrapping and stacking are resolution-dependent, and a
 * single "phone" viewport would miss the 360px Android and 430px iPhone Max
 * cases. The OG-card project is a fixture page and does not need a device
 * matrix.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `node --experimental-strip-types e2e/dev-server.ts`,
    url: `${baseURL}/a/dsh-postgres-mcp`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    cwd: '.',
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    ...mobileProjects(),
    {
      name: 'catalog-og',
      testMatch: /catalog-og\/.*\.spec\.ts/,
      use: {
        viewport: { width: 780, height: 520 },
        deviceScaleFactor: 2,
        defaultBrowserType: 'chromium',
      },
    },
  ],
})
