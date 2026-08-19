import type { Page } from '@playwright/test'
import { KITCHEN_SINK_ARTIFACT_ID } from './kitchen-sink-readme'
import { COMMUNITY_TOAST_IDS } from '../../frontend/src/widgets/community-toasts/model/dismissal.ts'
import { E2E_ORIGIN } from './origin'

/** A wide screenshot, served locally so the test does not depend on GitHub. */
const WIDE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="400">
  <rect width="1600" height="400" fill="#94a3b8"/>
  <text x="48" y="220" font-size="64" font-family="sans-serif" fill="#0f172a">architecture</text>
</svg>`

const BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20">
  <rect width="80" height="20" rx="4" fill="#334155"/>
  <text x="8" y="14" font-size="12" font-family="sans-serif" fill="#f8fafc">ok</text>
</svg>`

/**
 * Open the plugin page the kitchen-sink readme is seeded onto, with source
 * images stubbed so layout is deterministic and does not touch the network.
 *
 * The community stack arrives on a timer at the corner this suite photographs,
 * so it is dismissed up front. The subject here is the readme's own layout; an
 * overlay drifting into the frame would decide a stored baseline by how long
 * the page took to load. Its own suite is `e2e/community-toasts/`.
 */
export async function openPluginReadme(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: 'community', value: COMMUNITY_TOAST_IDS.join('.'), url: E2E_ORIGIN },
  ])

  await page.route('https://github.com/**', async (route) => {
    const url = route.request().url()
    if (route.request().resourceType() !== 'image' && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url)) {
      await route.fulfill({ status: 204, body: '' })
      return
    }
    const body = /architecture/i.test(url) ? WIDE_SVG : BADGE_SVG
    await route.fulfill({ contentType: 'image/svg+xml', body })
  })

  await page.goto(`/a/${KITCHEN_SINK_ARTIFACT_ID}`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Postgres MCP', level: 1 }).waitFor()
  await page.locator('#readme').waitFor()
  await page.evaluate(() => document.fonts.ready)
  // Wide screenshot and badge SVGs must have their intrinsic size before overflow is measured.
  await page.locator('#readme img').first().waitFor()
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('#readme img')).every(
      (node) => node instanceof HTMLImageElement && node.complete,
    ),
  )
}
