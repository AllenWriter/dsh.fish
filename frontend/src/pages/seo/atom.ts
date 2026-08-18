import { escapeXml } from './xml'

/** How many artifacts a feed carries. A feed is a "what changed" signal, not
 * an export — the sitemap set is the complete one. */
export const FEED_ENTRY_COUNT = 50

export interface AtomEntry {
  /** Permanent, language-independent identifier — the canonical English URL. */
  readonly id: string
  /** The localized artifact page this entry links to. */
  readonly url: string
  readonly title: string
  readonly summary?: string
  /** ISO 8601, which is what `<updated>` takes. */
  readonly updatedAt: string
}

export interface AtomFeed {
  /** The feed's own absolute URL — also its `<id>`. */
  readonly selfUrl: string
  /** The localized home page, as `<link rel="alternate">`. */
  readonly alternateUrl: string
  readonly title: string
  readonly subtitle: string
  /** BCP 47 tag for `xml:lang`. */
  readonly lang: string
  readonly authorName: string
  /** ISO 8601. The newest entry's `updatedAt`; Atom requires the element. */
  readonly updatedAt: string
  readonly entries: readonly AtomEntry[]
}

/**
 * Atom 1.0 serialisation.
 *
 * Hand-written for the same reason the sitemap is (see `xml.ts`): the document
 * is shallow, a Worker should not ship an XML builder, and escaping is the one
 * thing that must be right — every title and summary comes from a third-party
 * package manifest.
 *
 * Every entry's `<id>` is the unprefixed English artifact URL, so the same
 * artifact is the same entry in all ten language feeds and a reader switching
 * languages does not see the whole catalog as new.
 */
export function atomFeedXml(feed: AtomFeed): string {
  const entries = feed.entries
    .map((entry) =>
      [
        '  <entry>',
        `    <id>${escapeXml(entry.id)}</id>`,
        `    <title>${escapeXml(entry.title)}</title>`,
        `    <link rel="alternate" type="text/html" href="${escapeXml(entry.url)}"/>`,
        `    <updated>${entry.updatedAt}</updated>`,
        ...(entry.summary === undefined
          ? []
          : [`    <summary>${escapeXml(entry.summary)}</summary>`]),
        '  </entry>',
      ].join('\n'),
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${feed.lang}">
  <id>${escapeXml(feed.selfUrl)}</id>
  <title>${escapeXml(feed.title)}</title>
  <subtitle>${escapeXml(feed.subtitle)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${escapeXml(feed.selfUrl)}"/>
  <link rel="alternate" type="text/html" href="${escapeXml(feed.alternateUrl)}"/>
  <updated>${feed.updatedAt}</updated>
  <author>
    <name>${escapeXml(feed.authorName)}</name>
  </author>
${entries}
</feed>`
}

/**
 * Same cache contract as the sitemap set: the catalog re-crawls every six
 * hours, so an hour-old feed is never more than one sweep behind.
 */
export function atomResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'content-type': 'application/atom+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
