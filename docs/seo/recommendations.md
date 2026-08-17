# SEO recommendations

What is already implemented is described in the rest of this section. This
document is the backlog: what is worth doing next, and what is deliberately not
worth doing.

Priorities are `P0` (do before the site is announced), `P1` (do once it has
traffic), `P2` (do if the numbers justify it). No dates — order and dependencies
only.

---

## P0 — before announcing the site

### Register the origin with the engines

Nothing below matters until an engine knows the site exists. Submit
`https://dsh.fish/sitemap.xml` to Google Search Console and Bing Webmaster
Tools, and verify the property. Bing's submission also feeds DuckDuckGo. For a
DeepSeek-adjacent audience, submit to Baidu Ziyuan and Yandex Webmaster as well
— the Chinese and Russian catalogs are otherwise unlikely to be discovered at
all.

Then, in Search Console, check the **International Targeting** report. It is the
only place a broken `hreflang` cluster shows up as an error rather than as
silence.

### Confirm `PUBLIC_BASE_URL` is the production origin

Every canonical URL, every `hreflang` and every sitemap `<loc>` is built from
`container.config.baseUrl`, which is `PUBLIC_BASE_URL`. A preview deployment
that inherits the production value emits production canonicals from a preview
host; one that is left at `localhost` emits `http://localhost` canonicals to a
crawler. Set it per environment, and keep preview deployments out of the index
(a preview-only `X-Robots-Tag: noindex` response header is the usual mechanism).

### Get real content into the catalog

The single largest ranking factor here is not markup. A plugin page whose only
unique text is a one-line summary has almost nothing to rank on; the same page
with a readme has a few hundred words of it. The crawler already reads readmes —
make sure the ingestion path is actually populating `readmeMarkdown` for the
majority of rows, and treat a low fill rate as an SEO defect, not a cosmetic one.

---

## P1 — once there is traffic

### Per-artifact social cards

Today every page shares one static `/og.png`. A link to a specific plugin
previews as the generic site card, which is a wasted impression in exactly the
channel where developer tools spread — Slack, GitHub comments, X.

The approach that fits this stack: a resource route at `/a/:artifactId/og.png`
rendering with `satori` + `resvg-wasm` inside the Worker, cached in KV keyed by
artifact id and `updatedAt`. Budget roughly 150–300 ms for a cold render and
~1 MB of Wasm in the bundle; both are acceptable for a route that is only ever
hit by a link-preview fetcher, and neither touches the HTML path.

### A `SoftwareApplication` rich result

`offers` and `aggregateRating` are deliberately absent (see
[`structured-data.md`](structured-data.md)). Two honest routes to the rich
result:

- **`offers` with `price: 0`** once the catalog records a licence classification
  it can stand behind — that is a factual claim about a free, open-source
  artifact, not an invented one.
- **`aggregateRating`** only if the hub ever ships real ratings. Do not
  synthesise one from stars; a GitHub star is not a rating, and asserting that
  it is invites a manual action.

### Translate the highest-traffic artifact summaries

The catalog is deliberately not machine-translated. But a *curated* translation
of the summary for the top ~100 artifacts, stored as a distinct field and
attributed as an editorial translation, would make those pages genuinely
competitive in the non-English clusters instead of ranking on their frame alone.
This needs a schema change (`artifact_translations` keyed by artifact + locale)
and an editorial process. Do not start it without the second half.

### Measure which languages earn their keep

Ten languages is a guess, not a measurement. After a quarter of data, look at
impressions per language in Search Console. A language with no impressions is
maintenance cost with no return — and removing one is a single entry in
`LOCALES` plus a catalog file. Equally, a language with impressions and a poor
click-through rate usually means the translated title pattern reads badly in it,
which is a copy fix, not a technical one.

### Core Web Vitals

The pages are server-rendered and light, but this has not been measured against
field data. Two known candidates once there is a real page to measure:

- The Google Fonts stylesheet in `root.tsx` is a render-blocking request to a
  third-party origin. Self-hosting IBM Plex as a `woff2` subset with
  `font-display: swap` removes a DNS lookup, a TLS handshake and a round trip
  from the critical path.
- The plugin page's rendered readme is unbounded in height. A very long readme
  ships a large DOM on a page whose above-the-fold content is the header and the
  install panel.

Measure first. Neither is worth doing on suspicion.

---

## P2 — if the numbers justify it

### Content that is not a catalog row

A registry ranks for `<plugin name>` queries almost by default and for
`how do I …` queries almost never. Guides — "writing a dsh skill", "bridging
Claude Code hooks into dsh" — are what rank for the second kind, and they are
also what earns inbound links. `/docs` is one page today; it could be a section.

This is a content commitment, not a code change, which is why it is P2: a stale
guide is worse than no guide.

### Author pages

`/@:author` listing everything one author maintains. Real search demand
(`<author> dsh plugins`), a natural internal link from every plugin page, and it
reuses the collection page machinery. Worth doing once the catalog has enough
authors with more than one artifact for the pages not to be near-empty.

### Search-result pages for high-intent queries

`/browse?q=postgres` is `noindex` and should stay that way. But a small,
curated set of paths like `/for/postgres` — hand-picked term, hand-written
intro, machine-generated listing — is a different thing from an auto-generated
search page, and is what directories that rank actually do. Only worth it if
someone will curate them; auto-generating them is how a site earns a thin-content
penalty.

### `IndexNow`

Bing, Yandex and Seznam accept a push notification when a URL changes. The
six-hourly crawl already knows exactly which artifacts changed, so wiring
`IndexNow` into the ingestion report is perhaps thirty lines. Google does not
participate, so the return is bounded — but for the Russian catalog specifically
it is the difference between hours and weeks.

---

## Explicitly not recommended

- **Redirecting on `Accept-Language`.** Reasoned through in
  [`url-strategy.md`](url-strategy.md). It hides nine of ten languages from
  every crawler.
- **Machine-translating crawled readmes.** Thousands of pages of text nobody
  wrote, nobody reviewed and nobody can correct, in a context where being wrong
  about an install command has consequences.
- **A `keywords` meta tag.** No engine has used it in twenty years.
- **Making the filtered `/browse` views indexable.** They are near-duplicates of
  pages that already have canonical homes; indexing them would compete with
  those pages rather than add reach.
- **Prerendering the whole catalog to static files.** The site is already
  server-rendered from D1 in one round trip, and a catalog that re-crawls every
  six hours would need a rebuild on the same cadence to stay correct.
