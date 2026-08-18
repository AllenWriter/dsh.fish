# Crawling: robots, sitemaps, internal links

## robots.txt

Served from `frontend/src/pages/seo/robots.ts` at `/robots.txt`. It disallows
`/api/` and names the sitemap index.

Account pages remain crawlable even though they are `noindex, follow`. A search
engine must fetch a page to read that directive; blocking `/dashboard`,
`/device`, or `/sign-in` in robots.txt can leave the URL indexed without a
snippet because the crawler knows the URL exists but cannot see its `noindex`.
The API is different: it is machine-only JSON with no HTML directive to read,
so blocking it saves crawl budget without hiding an indexation instruction.

Nothing there is a security boundary. robots.txt is a request, and the paths it
names are exactly the paths anyone can read in it.

## The sitemap set

```
/sitemap.xml                  sitemapindex
├── /sitemaps/pages.xml       home, browse, 6 kinds, 12 categories, docs, submit
└── /sitemaps/artifacts/:page one page of the catalog, 2,500 artifacts each
```

An index rather than one flat file. Every non-deprecated artifact in the catalog
is included, not only the popular or recently updated rows, and every URL is
emitted once **per language**. At the current ten locales, production XML uses
about 12.7 KB per artifact after its alternate links are expanded; 2,500 rows
per file stays below the 50 MB uncompressed limit with room for longer ids and
future locales. A Worker also has to hold the whole document in memory to send
it. The index costs one extra fetch and never has to be restructured later.

Static pages get their own file so a crawler re-reading the catalog does not
re-read them, and vice versa.

### Alternates in the sitemap

Each `<url>` entry carries the full `xhtml:link` alternate set — the sitemap
form of `hreflang`. Both forms are emitted, here and in the page head, because
they are read at different times: the head only after a page is fetched, the
sitemap before anything is.

For ten languages that is 10 entries × 11 links per path. `pages.xml` is
therefore 220 `<url>` elements for 22 paths, which is correct, not a bug.

### `lastmod`

Artifact entries carry the artifact's own `updatedAt`, so a crawler re-reads
exactly the rows whose public page changed. A routine source check advances
`indexedAt` but leaves `updatedAt` alone; otherwise every hourly sweep would
falsely mark the whole catalog as modified and make `lastmod` meaningless.

### The read model

`ListSitemapEntries` (`backend/src/application/use-case/`) is separate from
`SearchArtifacts` on purpose. Search is bounded to a page a human would read and
rehydrates whole entities to render cards; a sitemap wants every row and two
fields from each. Running one through the other would either cap the sitemap at
a browse page's worth of URLs or make every browse page pay for a projection it
does not use.

It reads through `ArtifactRepository.listForSitemap`, a port method returning a
`SitemapEntry` projection (`id` + `updatedAt`) rather than an `Artifact`.

### Escaping

`escapeXml` handles the five characters XML cannot carry literally. Artifact ids
derive from third-party package names, and an unescaped `&` in one of them does
not produce a slightly wrong sitemap — it produces a document the crawler
rejects whole, taking the other 4,999 URLs in the file with it. There is a test
for exactly this.

### Caching

XML responses are `public, max-age=3600`. The catalog re-crawls every hour,
so an hour-old sitemap is never more than one sweep behind, and a crawler
pulling every file in the index does not cost one D1 read per file per fetch.

## Feeds

`/feed.xml` is an Atom 1.0 feed of the 50 most recently updated non-deprecated
artifacts, and each of the other nine languages has its own at
`/<locale>/feed.xml` — the same URL-prefix rule as every reader-facing page.
The route is `frontend/src/pages/seo/feed.ts`; serialization lives in
`atom.ts` next to it and reuses the sitemap's `escapeXml`, because entry titles
and summaries come from third-party package manifests too.

The sitemap and the feed answer different questions. The sitemap is the
complete, crawled-on-the-engine's-schedule inventory; the feed is the "what
changed" channel a reader's aggregator or a feed-aware crawler polls. A feed
is deliberately a window, not an export — the sitemap set is the complete one.

Two details keep the ten feeds coherent. Every entry's `<id>` is the canonical
*English* artifact URL, so the same artifact is the same entry in all ten
feeds and a subscriber switching languages does not see the whole catalog as
new. And each indexable page advertises its own language's feed with a
`<link rel="alternate" type="application/atom+xml">` in the head, emitted by
`pageMeta` next to the hreflang set.

Feeds carry the same cache contract as the sitemap (`public, max-age=3600`).

## IndexNow

Bing, Yandex, Seznam and Naver accept a push notification when a URL changes;
Google does not participate. The verification file is served at
`/indexnow-<key>.txt`, returning the key itself.

The route lives in the Worker entry (`frontend/workers/app.ts`), not in the
React Router table: the filename *is* the key, and route parameters only match
whole path segments, so no route pattern can express `indexnow-<key>.txt` with
a runtime key. The key is a plain var (`INDEXNOW_KEY` in
`frontend/wrangler.jsonc`) — public by design, since serving it is the entire
point. When the var is unset, the file 404s and submissions simply cannot be
verified.

Submission is a manual post-deploy step, not part of the cron sweep:

```sh
INDEXNOW_KEY=<key> pnpm --filter @dsh-fish/frontend run indexnow:submit
```

`frontend/scripts/indexnow-submit.mjs` reads the sitemap index, fetches every
child sitemap, and submits the full URL set to `https://api.indexnow.org` in
batches of 10,000 (the protocol cap). URLs come from the sitemap rather than
the database so the submitted set is by definition the set we want indexed.

## Internal link graph

A page nothing links to is a page nothing ranks. Three deliberate link sources:

1. **The footer** links every artifact type and every category to its own
   indexable path, generated from the domain taxonomy rather than hand-listed —
   so a kind added to the domain appears in the footer and the sitemap in the
   same commit. Eighteen links in a footer is unremarkable for a directory, and
   it makes every landing page one hop from every other page.
2. **The home page's type chips** point at `/kind/<kind>`, not at `?kind=`.
3. **Each plugin page** carries a visible breadcrumb up to its type's collection
   page, and links its categories to theirs.

Language variants are not in the internal link graph. A crawler that reached one
language finds the other nine through the `hreflang` set in the page head and
the sitemap `xhtml:link` alternates. The header language switcher is a reader
control; its panel is portal-rendered and is not in the server's HTML.

## Social card

Static pages point `og:image` at `/og.png`, generated by
`frontend/scripts/build-og-image.mjs` and committed:

```sh
pnpm --filter @dsh-fish/frontend run og:build
```

The site card deliberately contains no translatable sentence. All ten language
variants share the same image while their `og:title`, `og:description`,
`og:locale`, and image alt text stay localized in the page head; an English-only
claim baked into the bitmap would contradict nine of those previews.

Generated rather than drawn, and committed rather than rendered per request: a
Worker would need a font rasteriser and a few hundred milliseconds to produce it
at request time, and the card does not vary. Re-run it when the palette or the
wordmark changes. In a sandbox that ships its own Chromium, set
`CHROMIUM_EXECUTABLE_PATH` rather than letting Playwright download a second copy.

Artifact pages instead point `og:image` at `/a/:artifactId/og.png`, a resource
route that renders the card on request with satori (JSX → SVG) and
`@resvg/resvg-wasm` (SVG → PNG) inside the Worker
(`frontend/src/pages/artifact-og/`, renderer in `frontend/src/shared/lib/og/`).
The card carries the artifact's name, kind, grade, counts and summary over the
same dark ground as the site card, in English only — one bitmap per artifact
serves every language variant, same as the site card. It has to be a PNG:
Slack, X and the other link-preview fetchers do not rasterise SVG `og:image`s,
so an SVG route would preview as nothing. The Wasm cost (~1 MB of bundle,
~150–300 ms cold) lands only on link-preview fetches, never on the HTML path;
responses carry the same `public, max-age=3600` contract as the sitemap XML.

A sibling route, `/a/:artifactId/badge.svg`, serves the shields-style README
badge (`dsh.fish | A · 78`, or the star count with `?metric=stars`). The
artifact page hands authors the Markdown snippet; the badge lives outside
`/api/` because that namespace is the versioned JSON contract, and robots.txt
keeps crawlers out of it.
