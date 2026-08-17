import { defineConfig } from '@playwright/test'
import { mobileProjects } from './e2e/lib/devices'

const PORT = 5173
const baseURL = `http://localhost:${PORT}`

/**
 * Mobile markdown rendering on the plugin detail page.
 *
 * One Chromium run, many device projects: the readme's overflow, wrapping and
 * stacking are resolution-dependent, and a single "phone" viewport would miss
 * the 360px Android and 430px iPhone Max cases.
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
  projects: mobileProjects(),
})
