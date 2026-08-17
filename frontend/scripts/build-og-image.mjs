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
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(HERE, "../public/og.png");
const BRAND_ICON = resolve(HERE, "../public/icons/whale-brand.png");
const GITHUB_OUTPUT = resolve(HERE, "../../.github/social-preview.png");
const GITHUB_BACKGROUND = resolve(
  HERE,
  "../../.github/assets/social-preview-background.png",
);

/** Open Graph's canonical size. Anything else gets re-cropped by someone. */
const WIDTH = 1200;
const HEIGHT = 630;
const GITHUB_WIDTH = 1280;
const GITHUB_HEIGHT = 640;
const brandIcon = await readFile(BRAND_ICON, "base64");
const ecosystemBackground = await readFile(GITHUB_BACKGROUND, "base64");

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
        background: var(--bg) url("data:image/png;base64,${ecosystemBackground}") center / cover no-repeat;
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
      main { position: relative; z-index: 1; width: 620px; }
      .hub-mark {
        position: absolute;
        left: 74.8%;
        top: 50%;
        width: 118px;
        height: 118px;
        transform: translate(-50%, -50%);
        object-fit: contain;
      }
      .mark { display: flex; align-items: center; gap: 18px; }
      .mark img { width: 58px; height: 58px; object-fit: contain; }
      .mark span { font-size: 76px; font-weight: 600; letter-spacing: -0.035em; }
      .context {
        margin-top: 24px;
        font-size: 30px;
        line-height: 1.4;
        color: var(--muted-fg);
        letter-spacing: 0.01em;
      }
    </style>
  </head>
  <body>
    <img class="hub-mark" src="data:image/png;base64,${brandIcon}" alt="" />
    <main>
      <div class="mark">
        <img src="data:image/png;base64,${brandIcon}" alt="" />
        <span>dsh.fish</span>
      </div>
      <div class="context">DeepSeek Harness</div>
    </main>
  </body>
</html>`;

const GITHUB_PAGE = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: ${GITHUB_WIDTH}px;
        height: ${GITHUB_HEIGHT}px;
        background: #0b1114 url("data:image/png;base64,${ecosystemBackground}") center / cover no-repeat;
        color: #f2f5f3;
        font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, 'Segoe UI', Roboto,
          'Helvetica Neue', Arial, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 76px 84px;
        position: relative;
        overflow: hidden;
        -webkit-font-smoothing: antialiased;
      }
      body::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, rgba(7, 13, 16, 0.18) 0%, rgba(7, 13, 16, 0) 68%);
        pointer-events: none;
      }
      main { position: relative; z-index: 1; width: 650px; }
      .hub-mark {
        position: absolute;
        left: 73.7%;
        top: 50%;
        width: 118px;
        height: 118px;
        transform: translate(-50%, -50%);
        object-fit: contain;
        z-index: 1;
      }
      .mark { display: flex; align-items: center; gap: 16px; }
      .mark img { width: 54px; height: 54px; object-fit: contain; }
      .mark span { font-size: 36px; font-weight: 650; letter-spacing: -0.02em; }
      h1 {
        margin-top: 42px;
        font-size: 66px;
        line-height: 1.05;
        font-weight: 650;
        letter-spacing: -0.035em;
      }
      p {
        margin-top: 24px;
        color: #a7b7b8;
        font-size: 27px;
        line-height: 1.35;
      }
    </style>
  </head>
  <body>
    <img class="hub-mark" src="data:image/png;base64,${brandIcon}" alt="" />
    <main>
      <div class="mark">
        <img src="data:image/png;base64,${brandIcon}" alt="" />
        <span>dsh.fish</span>
      </div>
      <h1>Discover plugins for DeepSeek Harness.</h1>
      <p>Search, inspect and install from the open-source marketplace.</p>
    </main>
  </body>
</html>`;

// A sandbox that ships its own Chromium can point at it instead of making
// Playwright download a second copy.
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  for (const { width, height, html, output, label } of [
    {
      width: WIDTH,
      height: HEIGHT,
      html: PAGE,
      output: OUTPUT,
      label: "site OG",
    },
    {
      width: GITHUB_WIDTH,
      height: GITHUB_HEIGHT,
      html: GITHUB_PAGE,
      output: GITHUB_OUTPUT,
      label: "GitHub social preview",
    },
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      // 1× is the right density: each file is served at its exact dimensions.
      deviceScaleFactor: 1,
    });
    await page.setContent(html, { waitUntil: "load" });
    const png = await page.screenshot({ type: "png" });
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, png);
    await page.close();
    console.log(`${label} written: ${output} (${png.length} bytes)`);
  }
} finally {
  await browser.close();
}
