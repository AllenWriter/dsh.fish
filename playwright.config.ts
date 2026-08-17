import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './frontend/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    viewport: { width: 780, height: 520 },
    deviceScaleFactor: 2,
  },
})
