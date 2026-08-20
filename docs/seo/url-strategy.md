# URL strategy

One document, one URL. The language is negotiated per request, never carried
in the path.

## Language lives in the request

One URL serves every language. The locale is resolved per request, in order:

1. The `dsh_locale` cookie — an explicit choice from the language switcher.
2. `Accept-Language` — matched against the six catalogs, Chinese by script
   (`zh-Hant`, `zh-HK` → `zh-TW`; `zh`, `zh-SG` → `zh-CN`).
3. The default language, English.

A click outranks a browser setting: the setting is a guess, the click is a
decision. The resolution is `resolveLocale(request)` in
`frontend/src/shared/config/i18n/resolve-locale.ts`; loaders call it directly
and hand the result down through loader data and React context.

Why not the path: a reader's language ended at the first click that left a
prefixed URL — every typed, bookmarked or externally shared link reset them to
English. Negotiation makes the language a property of the reader instead of
the address. The cost is multilingual indexation: one URL can only be indexed
once, so engines see the default language. That trade is deliberate — see
[`../decisions/adr-0002-negotiated-locale-urls.md`](../decisions/adr-0002-negotiated-locale-urls.md).

**Old prefixed URLs redirect.** Every URL from the prefixed era — active
locales, retired ones (de, fr, es, pt-BR), any casing — 301s onto the bare
path of the same page: `/ja/browse` → `/browse`, `/de/a/x` → `/a/x`. The
301 keeps the link's weight and teaches crawlers to drop the old form.

## Routing

Routes carry no language segment:

```ts
route('browse', './pages/browse/browse-page.tsx')
```

`canonicalLocaleRedirect` runs in `frontend/workers/app.ts` before routing and
issues the 301 for any first segment that is a known locale, active or
retired. A first segment that is not a language is left alone — that is a
page path, and whether it exists is the router's question.

## Canonical tags

`pageMeta` emits, for every indexable page, a `<link rel="canonical">` at the
page's one URL. There is **no `hreflang` set**: `hreflang` exists to connect
distinct per-language URLs, and there are none.

The canonical is built from the page's path **without its query string**. That
is what folds `/a/x?profile=web` into `/a/x`: previewing an install plan for a
different profile is the same document.

A page that is `noindex` emits **no** canonical. A `noindex` page that also
points a canonical at a different URL hands an engine two contradictory
instructions about one document, and which one wins is undefined.

## Edge caching

A negotiated response must never leak across languages through a shared cache.
The Cache API does not vary on `Cookie` or `Accept-Language`, so the resolved
locale is folded into the cache key's query string
(`frontend/workers/edge-cache.ts`) — each language gets its own slice of every
URL. The locale cookie is the one cookie that does not bypass the cache: it
only selects a slice the key already separates.

## Trailing slashes

`canonicalLocaleRedirect` normalises a trailing slash away when folding a
prefixed URL, so the prefixed form of `/browse/` lands on the same canonical
URL as everything else.
