/**
 * Submits every URL in the sitemap set to IndexNow.
 *
 * IndexNow is the push channel Bing, Yandex, Seznam and Naver read: one POST
 * tells them a URL changed instead of waiting for the next crawl. Google does
 * not participate, so this complements the sitemap rather than replacing it.
 *
 * Run it after a deploy, or after a crawl sweep that changed a large slice of
 * the catalog:
 *
 *     INDEXNOW_KEY=<key> pnpm --filter @dsh-fish/frontend run indexnow:submit
 *
 * `INDEXNOW_KEY` must match the var in `wrangler.jsonc` — the Worker serves the
 * verification file at `/indexnow-<key>.txt`, and the engine fetches that file
 * before accepting any URL for the host. `PUBLIC_BASE_URL` defaults to the
 * production origin; set it to submit a different environment's URLs.
 *
 * URLs come from the sitemap set rather than from the database: the sitemap is
 * by definition the list of URLs we want indexed, so the two can never drift.
 */
const BASE_URL = (process.env.PUBLIC_BASE_URL ?? "https://dsh.fish").replace(
  /\/+$/,
  "",
);
const KEY = process.env.INDEXNOW_KEY ?? "";
const ENDPOINT = "https://api.indexnow.org/indexnow";
/** The protocol caps one submission at 10,000 URLs. */
const BATCH_SIZE = 10_000;

if (KEY === "") {
  console.error("INDEXNOW_KEY is required (it is a var in wrangler.jsonc).");
  process.exit(1);
}

/** Every `<loc>` of one XML document, with XML entities folded back. */
function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) =>
    loc
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&"),
  );
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`);
  }
  return response.text();
}

const index = await fetchText(`${BASE_URL}/sitemap.xml`);
const sitemapUrls = extractLocs(index);
console.log(`sitemap index lists ${sitemapUrls.length} files`);

const urls = [];
for (const sitemapUrl of sitemapUrls) {
  urls.push(...extractLocs(await fetchText(sitemapUrl)));
}
console.log(`collected ${urls.length} URLs`);

const host = new URL(BASE_URL).host;
for (let offset = 0; offset < urls.length; offset += BATCH_SIZE) {
  const urlList = urls.slice(offset, offset + BATCH_SIZE);
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: KEY,
      keyLocation: `${BASE_URL}/indexnow-${KEY}.txt`,
      urlList,
    }),
  });
  if (!response.ok) {
    throw new Error(`IndexNow submission failed: ${response.status}`);
  }
  console.log(`submitted ${urlList.length} URLs (${response.status})`);
}
