/**
 * Renders the social card to `public/og.png`.
 *
 * A link to any page on this site — pasted into Slack, a PR description, a
 * tweet — renders as whatever `og:image` points at. Without one, every share
 * of every plugin page is a bare grey rectangle.
 *
 * Generated rather than drawn, and committed rather than rendered per request:
 * a Worker would need a font rasteriser and a few hundred milliseconds to
 * produce this at request time, and the card does not vary. Re-run it when the
 * palette or the wordmark changes:
 *
 *     pnpm --filter @dsh-fish/frontend run og:build
 *
 * Playwright is already a dev dependency of the repository, and Chromium is
 * what the design tokens below were authored against — `oklch()` and the rest
 * render exactly as they do in the product.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(HERE, '../public/og.png')

/** Open Graph's canonical size. Anything else gets re-cropped by someone. */
const WIDTH = 1200
const HEIGHT = 630

/** The dark palette from `app/styles/app.css`, inlined — this is one image. */
const PAGE = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        --bg: oklch(0.17 0.011 255);
        --fg: oklch(0.96 0.004 106);
        --muted-fg: oklch(0.68 0.014 254);
        --primary: oklch(0.72 0.106 191);
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: ${WIDTH}px;
        height: ${HEIGHT}px;
        background: var(--bg);
        color: var(--fg);
        font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, 'Segoe UI', Roboto,
          'Helvetica Neue', Arial, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 88px 96px;
        position: relative;
        overflow: hidden;
        -webkit-font-smoothing: antialiased;
      }
      /* The same single soft wash the hero uses, so the card and the page a
         reader lands on are recognisably the same product. */
      .wash {
        position: absolute;
        top: -320px;
        left: 50%;
        transform: translateX(-50%);
        width: 900px;
        height: 900px;
        border-radius: 50%;
        background: var(--primary);
        opacity: 0.14;
        filter: blur(120px);
      }
      .mark { display: flex; align-items: center; gap: 18px; }
      .mark svg { width: 52px; height: 52px; }
      .mark span { font-size: 40px; font-weight: 600; letter-spacing: -0.02em; }
      h1 {
        margin-top: 44px;
        font-size: 84px;
        line-height: 1.04;
        font-weight: 600;
        letter-spacing: -0.035em;
        max-width: 16ch;
      }
      p {
        margin-top: 28px;
        font-size: 32px;
        line-height: 1.4;
        color: var(--muted-fg);
        max-width: 42ch;
      }
      .kinds {
        margin-top: 52px;
        display: flex;
        gap: 12px;
        font-size: 22px;
        color: var(--muted-fg);
      }
      .kinds span {
        border: 1px solid oklch(0.32 0.014 255);
        border-radius: 999px;
        padding: 8px 18px;
      }
    </style>
  </head>
  <body>
    <div class="wash"></div>
    <div class="mark">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="7" fill="#0f766e" />
        <path d="M11 9v5a5 5 0 0 0 10 0V9" stroke="#fff" stroke-width="2.6"
          stroke-linecap="round" fill="none" />
        <path d="M16 19v5" stroke="#fff" stroke-width="2.6" stroke-linecap="round" />
      </svg>
      <span>dsh.fish</span>
    </div>
    <h1>Everything is a plugin.</h1>
    <p>The plugin hub for DeepSeek Harness.</p>
    <div class="kinds">
      <span>Bundles</span>
      <span>Skills</span>
      <span>MCP servers</span>
      <span>Agent presets</span>
      <span>Profiles</span>
    </div>
  </body>
</html>`

// A sandbox that ships its own Chromium can point at it instead of making
// Playwright download a second copy.
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
const browser = await chromium.launch(executablePath ? { executablePath } : {})
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    // 1× is the right density: the file is served at exactly 1200×630 and a
    // retina render would double the bytes on every link preview for nothing.
    deviceScaleFactor: 1,
  })
  await page.setContent(PAGE, { waitUntil: 'load' })
  const png = await page.screenshot({ type: 'png' })
  await mkdir(dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, png)
  console.log(`og image written: ${OUTPUT} (${png.length} bytes)`)
} finally {
  await browser.close()
}
