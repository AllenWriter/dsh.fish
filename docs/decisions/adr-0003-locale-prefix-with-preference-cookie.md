# ADR 0003: Locale prefixes with a preference cookie

## Status

- Accepted (supersedes [ADR 0002](adr-0002-negotiated-locale-urls.md))

## Context

ADR 0002 moved the site to a single URL per document with per-request
language negotiation, trading multilingual indexation away for a stable
reader experience. The trade proved wrong on the first half: with one URL,
engines can only ever index the default language — an index maps a URL to one
document, and hreflang requires distinct per-language URLs by specification.
Google's own locale-adaptive guidance is explicit that non-default languages
may never be crawled or indexed, and recommends separate URLs.

The reader-experience problem ADR 0002 set out to fix was real, though:
every bare or foreign-language entry point resets the reader's language.

## Decision

Keep language prefixes in the path (`/ja/browse`), restoring hreflang,
per-language sitemap entries and per-language feeds — the arrangement engines
can index.

On top of it, remember the reader: choosing a language in the switcher writes
a `dsh_locale` cookie, and a browser visit to a **bare** URL carrying that
cookie is forwarded to the same page under the reader's prefix with a 302.

The redirect is deliberately narrow:

- never on a prefixed URL — an explicit URL always wins;
- never for non-`text/html` requests — feeds, markdown negotiation and the
  API answer what was asked;
- never for crawlers, which hold no cookie;
- a 302, not a 301 — a preference is not a permanent move, and the temporary
  redirect stays out of the edge cache.

## Consequences

Easier:

- Every language is crawlable, indexable and linkable again.
- A reader's explicit choice survives bare-URL entry points, without any
  guessing: no `Accept-Language` redirect is performed.

Harder:

- First visits still land in the link's language until the reader chooses
  once; the cookie only helps from the second visit.
- Two mechanisms (prefix + cookie) must stay coherent; the cookie can only
  hold a declared locale, so retired languages retire from it automatically.

## Alternatives considered

- **Single negotiated URL (ADR 0002).** Superseded: multilingual indexation
  is structurally impossible on one URL.
- **Prefixes + `Accept-Language` first-visit redirect.** Google advises
  against redirecting on a guessed language, and a mis-guess is harder to
  escape than English. Rejected in favour of cookie-only forwarding.

## References

- [`../seo/url-strategy.md`](../seo/url-strategy.md)
- [Google Search Central: locale-adaptive pages](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages)
