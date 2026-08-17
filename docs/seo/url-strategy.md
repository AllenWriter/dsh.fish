# URL strategy

One document, one URL, in ten languages.

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

## Canonical tags and alternates

`pageMeta` emits, for every indexable page:

- `<link rel="canonical">` pointing at this page in **this** language.
- `<link rel="alternate" hreflang="…">` for all ten languages **plus**
  `x-default` pointing at the unprefixed default.

The set is reciprocal — every language lists every other, including itself — so
a crawler landing on any one of them discovers the rest.

`hreflang` uses **script** subtags for Chinese (`zh-Hans`, `zh-Hant`) rather
than region ones. A reader in Singapore reads simplified Chinese and would be
excluded by a `zh-CN` region match; the script is exactly what distinguishes
the two catalogs that are actually maintained.

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
language while the other nine stay invisible. Readers get a language switcher
instead: a control in the header and a crawlable list of the same links in the
footer.

## Trailing slashes

`splitLocalePath` normalises a trailing slash away, so `/browse/` and `/browse`
resolve to the same canonical URL.
