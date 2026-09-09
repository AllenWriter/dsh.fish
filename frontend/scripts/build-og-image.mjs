/**
 * Open Graph card for Jens' Blog.
 *
 * `public/og.png` is the committed artistic site card (1200×630). Replace that
 * file when the art changes, then run:
 *
 *     pnpm --filter @dsh-fish/frontend run og:build
 *
 * to refresh `.github/social-preview.png` from the same image.
 */
import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OG = resolve(HERE, "../public/og.png");
const GITHUB_OUTPUT = resolve(HERE, "../../.github/social-preview.png");

const info = await stat(OG);
await mkdir(dirname(GITHUB_OUTPUT), { recursive: true });
await copyFile(OG, GITHUB_OUTPUT);
console.log(`Site OG: ${OG} (${info.size} bytes)`);
console.log(`GitHub social preview copied: ${GITHUB_OUTPUT}`);
