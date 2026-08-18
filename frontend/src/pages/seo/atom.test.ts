import { describe, expect, it } from 'vitest'
import { atomFeedXml, type AtomFeed } from './atom'

const ORIGIN = 'https://dsh.fish'

function feed(overrides: Partial<AtomFeed> = {}): AtomFeed {
  return {
    selfUrl: `${ORIGIN}/feed.xml`,
    alternateUrl: ORIGIN,
    title: 'dsh.fish — latest plugins',
    subtitle: 'Recently updated plugins for DeepSeek Harness.',
    lang: 'en',
    authorName: 'dsh.fish',
    updatedAt: '2026-01-02T00:00:00.000Z',
    entries: [
      {
        id: `${ORIGIN}/a/dsh-hello`,
        url: `${ORIGIN}/a/dsh-hello`,
        title: 'dsh-hello',
        summary: 'Greets the agent.',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: `${ORIGIN}/a/dsh-world`,
        url: `${ORIGIN}/a/dsh-world`,
        title: 'dsh-world',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

describe('atomFeedXml', () => {
  const xml = atomFeedXml(feed())

  it('is a valid Atom 1.0 document shape', () => {
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">')
    expect(xml).toContain(`<id>${ORIGIN}/feed.xml</id>`)
    expect(xml).toContain(
      `<link rel="self" type="application/atom+xml" href="${ORIGIN}/feed.xml"/>`,
    )
    expect(xml).toContain('<updated>2026-01-02T00:00:00.000Z</updated>')
    // Atom requires an author somewhere; one feed-level author covers every
    // entry that has none of its own.
    expect(xml).toContain('<name>dsh.fish</name>')
  })

  it('emits one entry per artifact, each with id, link and updated', () => {
    expect(xml.match(/<entry>/g)).toHaveLength(2)
    expect(xml).toContain(`<id>${ORIGIN}/a/dsh-hello</id>`)
    expect(xml).toContain(
      `<link rel="alternate" type="text/html" href="${ORIGIN}/a/dsh-world"/>`,
    )
    expect(xml).toContain('<title>dsh-hello</title>')
  })

  it('omits an absent summary rather than emitting an empty one', () => {
    expect(xml.match(/<summary>/g)).toHaveLength(1)
    expect(xml).toContain('<summary>Greets the agent.</summary>')
  })

  it('escapes third-party copy that would otherwise void the whole feed', () => {
    // Display names and summaries come from package manifests; one raw `&`
    // makes the document unparseable, the same failure as the sitemap's.
    const escaped = atomFeedXml(
      feed({
        entries: [
          {
            id: `${ORIGIN}/a/dsh-hello`,
            url: `${ORIGIN}/a/dsh-hello`,
            title: 'a&b',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
        ],
      }),
    )
    expect(escaped).not.toMatch(/a&b/)
    expect(escaped).toContain('<title>a&amp;b</title>')
  })
})
