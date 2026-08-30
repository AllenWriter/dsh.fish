# URL strategy

One document, one URL, in three languages.

## Language lives in the path

| Language | Home | A plugin page |
|---|---|---|
| English (default) | `/` | `/a/acme-release-notes` |
| Simplified Chinese | `/zh-CN` | `/zh-CN/a/acme-release-notes` |
| Japanese | `/ja` | `/ja/a/acme-release-notes` |

Sub-directories, not sub-domains and not a `?lang=` parameter:

- A directory inherits the origin's accumulated authority. A sub-domain starts
  from nothing and needs its own DNS record, certificate and verification.
- A query parameter is not reliably a separate document to a crawler — it looks
  like a session id or a filter, and is crawled and ranked accordingly.
- A path prefix is visible in a shared link, which is how most language-specific
  traffic actually propagates.

**The default language has no prefix.** `/browse` is English; `/en/browse` is a
301 to it. Publishing both is the single most common way a multilingual site
splits its own ranking signal across two URLs for one document.

**Retired languages redirect.** German, French, Spanish, Brazilian
Portuguese, Traditional Chinese, Korean and Russian were served once and are
no longer declared, so `/de/*`, `/fr/*`, `/es/*`, `/pt-BR/*`, `/zh-TW/*`,
`/ko/*` and `/ru/*` 301 onto the same path in the default language —
`/de/browse` and `/zh-TW/blog` land on `/browse` and `/blog`. Their stored
README translations are left in the database; they are simply not routed.

## Remembering the reader's choice

The prefix makes every entry point land in the link's language, which for a
bare link is the default one. The switcher therefore records an explicit
choice in the `dsh_locale` cookie, and a browser visit to a **bare** URL
carrying that cookie gets a 302 to the same page under the reader's prefix —
`/browse` becomes `/ja/browse`. A 302, not a 301: a preference is not a
permanent move, and the temporary redirect never enters the edge cache.

The redirect never overrides an explicit prefix, never fires for
non-`text/html` requests (feeds, markdown negotiation, API), and never fires
for crawlers, which hold no cookie. See
[`../decisions/adr-0003-locale-prefix-with-preference-cookie.md`](../decisions/adr-0003-locale-prefix-with-preference-cookie.md).

## Routing

Every reader-facing route carries an optional first segment:

```ts
route(':locale?/browse', './pages/browse/browse-page.tsx')
```

One route module serves both `/browse` and `/ja/browse`. An optional segment
matches *any* first segment, so `/nonsense/browse` also reaches the browse
route with `locale === 'nonsense'`. Serving that would publish an unbounded set
of URLs all rendering the same English page, so **every localized loader starts
with `requireLocale(params.locale)`**, which throws a real 404 for anything that
is not a declared language.

This is not optional and not decorative. A loader that skips it is a duplicate
content generator.

## Canonical redirects

`canonicalLocaleRedirect` runs in `frontend/workers/app.ts` before routing and
issues a 301 for two cases:

| Requested | Redirects to | Why |
|---|---|---|
| `/en/browse` | `/browse` | The default language is served bare. |
| `/ZH-cn/browse` | `/zh-CN/browse` | React Router matches paths case-insensitively; a crawler does not. |

A first segment that is not a language at all is left alone — that is a page
path, and whether it exists is the router's question.

Retired category slugs 301 onto the live taxonomy at the same layer, after
locale folding and before the preferred-locale 302:

| Requested | Redirects to |
|---|---|
| `/category/coding` | `/category/git` |
| `/ja/category/models` | `/ja/category/model` |
| `/category/communication` | `/category/notify` |

Canonical ids (`/category/git`, `/category/other`) stay. An unknown id still
404s. The aliases are the previous hub ids and Oh-My-DSH's slugs; they are
not a second browse taxonomy.

Retired artifact kinds 301 onto `/browse` at the same layer. Their publish
guides fold onto `/docs/plugins`:

| Requested | Redirects to |
|---|---|
| `/kind/mcp-server` | `/browse` |
| `/kind/hook-bridge` | `/browse` |
| `/docs/publish/mcp-server` | `/docs/plugins` |
| `/docs/publish/hook-bridge` | `/docs/plugins` |

## Canonical tags and alternates

`pageMeta` emits, for every indexable page:

- `<link rel="canonical">` pointing at this page in **this** language.
- `<link rel="alternate" hreflang="…">` for all public languages **plus**
  `x-default` pointing at the unprefixed default.

The set is reciprocal — every language lists every other, including itself — so
a crawler landing on any one of them discovers the rest.

`hreflang` uses a **script** subtag for Simplified Chinese (`zh-Hans`) rather
than a region one. A reader in Singapore reads simplified Chinese and would be
excluded by a `zh-CN` region match. Traditional Chinese is retired and is not
advertised.

The canonical is built from the page's path **without its query string**. That
is what folds `/a/x?profile=web` into `/a/x`: previewing an install plan for a
different profile is the same document.

A page that is `noindex` emits **no** canonical and no alternates. A `noindex`
page that also points a canonical at a different URL hands an engine two
contradictory instructions about one document, and which one wins is undefined.

## No automatic language redirects

The site never redirects on `Accept-Language`, and never varies the response
body by it. A crawler sends no language preference, so a site that guesses
serves it whatever language happens to be first in the header — and indexes one
language while the other languages stay invisible. Readers get a language switcher
in the header. Crawlers get the `hreflang` set in the page head and the sitemap
`xhtml:link` alternates.

## Trailing slashes

`splitLocalePath` normalises a trailing slash away, so `/browse/` and `/browse`
resolve to the same canonical URL.
