# ADR 0002: Negotiated locale on a single URL

## Status

- Accepted (supersedes the URL-prefix strategy implied by ADR 0001's SEO layer)

## Context

The site launched with language prefixes in the path (`/ja/browse`), the
standard multilingual-SEO arrangement: one URL per language, hreflang
clusters, per-language sitemap entries.

In practice, readers kept losing their language. Every entry point that was
not a prefixed link — a typed URL, a bookmark, a search result, a shared
link — reset the session to English, and the crawler-driven traffic the
prefix scheme optimises for had not yet materialised for a young site.

The prefix scheme also multiplied everything: six sitemap entries per URL,
hreflang sets on every page, a redirect layer for retired locales, and a
README-translation surface addressed by URL.

## Decision

One URL per document. The language is negotiated per request:

1. `dsh_locale` cookie (explicit switcher choice),
2. `Accept-Language` (Chinese matched by script),
3. English.

Every prefixed URL from the old scheme — active or retired locales, any
casing — 301-redirects to the bare path. hreflang, per-language sitemap
entries, and per-language feed URLs are removed. The edge cache folds the
resolved locale into its cache key, so languages never share a cached entry.

## Consequences

Easier:

- A reader's language survives every entry point once chosen (cookie), and
  follows the browser otherwise (`Accept-Language`).
- One sitemap entry per URL; no hreflang cluster to keep reciprocal.
- README translations resolve from the same negotiated locale everywhere.

Harder:

- Engines index the default language only. Non-English discovery now depends
  on the reader's browser settings and word of mouth, not on per-language
  search results. This is the accepted cost.
- Any shared cache in front of the Worker must respect the locale-sliced
  cache key; a naive CDN rule keyed on URL alone would serve the wrong
  language.

## Alternatives considered

- **Keep prefixes + preference cookie redirect.** The industry default for
  public content sites, and keeps per-language indexing. Rejected: the
  language-reset problem persists for every prefixed link a reader receives,
  and the multilingual index was not earning its complexity.
- **Subdomains per language.** Same indexing benefits as prefixes with more
  DNS/certificate surface; same language-reset problem. Rejected.

## References

- [`../seo/url-strategy.md`](../seo/url-strategy.md)
- [`../frontend/i18n.md`](../frontend/i18n.md)
