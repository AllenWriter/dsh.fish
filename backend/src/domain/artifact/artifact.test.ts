import { describe, expect, it } from 'vitest'
import { Artifact } from './artifact.js'
import { FALLBACK_CATEGORY } from './category.js'
import { githubSource, npmSource } from './source-ref.js'

const base = {
  id: 'dsh-hello-plugin',
  kind: 'bundle',
  displayName: 'dsh-hello-plugin',
  summary: 'A bundle.',
  source: npmSource('dsh-hello-plugin', '1.0.0'),
  payload: { kind: 'bundle', requiresBuild: false },
} as const

/**
 * The aggregate is where the crawler and a user submission have to agree, so
 * the category invariant is enforced here rather than at either boundary.
 */
describe('Artifact categories', () => {
  it('keeps what the author declared', () => {
    expect(Artifact.create({ ...base, categories: ['coding'] }).categories).toEqual(['coding'])
  })

  it('survives a category name the taxonomy does not have', () => {
    // Previously `slug()` threw here and the ingest sweep counted the whole
    // artifact as skipped: one bad advisory string removed a working plugin
    // from the catalog entirely.
    const artifact = Artifact.create({ ...base, categories: ['AI Coding', 'coding'] })
    expect(artifact.categories).toEqual(['coding'])
  })

  it('never leaves a row uncategorised', () => {
    expect(Artifact.create({ ...base }).categories).toEqual([FALLBACK_CATEGORY])
    expect(Artifact.create({ ...base, categories: [] }).categories).toEqual([FALLBACK_CATEGORY])
  })

  it('re-reads categories on refresh, like keywords', () => {
    // An author who adds `dsh.hub.categories` after publishing gets it applied
    // by the next sweep; before, the field was frozen at creation.
    const artifact = Artifact.create({ ...base, categories: ['other'] })
    const refreshed = artifact.refreshedWith({
      displayName: artifact.displayName,
      summary: artifact.summary,
      source: githubSource({ owner: 'acme', repo: 'hello' }),
      payload: artifact.payload,
      keywords: ['hello'],
      categories: ['devops'],
      stats: { stars: 3, downloads: 0, installs: 0 },
    })

    expect(refreshed.categories).toEqual(['devops'])
  })

  it('stores a GitHub Social preview and can clear it on refresh', () => {
    const preview =
      'https://opengraph.githubassets.com/preview/acme/hello'
    const artifact = Artifact.create({ ...base, ogImageUrl: preview })
    expect(artifact.ogImageUrl).toBe(preview)

    const cleared = artifact.refreshedWith({
      displayName: artifact.displayName,
      summary: artifact.summary,
      source: artifact.source,
      payload: artifact.payload,
      keywords: [],
      categories: ['other'],
      stats: artifact.stats,
      ogImageUrl: null,
    })
    expect(cleared.ogImageUrl).toBeUndefined()
  })

  it('carries the scanned commit through refresh, and keeps it when a sweep did not look', () => {
    const sha = 'c0ffee'.padEnd(40, '0')
    const artifact = Artifact.create({ ...base, sourceCommitSha: sha })
    expect(artifact.sourceCommitSha).toBe(sha)

    // A sweep whose commit resolution failed must not wipe the pinned SHA.
    const kept = artifact.refreshedWith({
      displayName: artifact.displayName,
      summary: artifact.summary,
      source: artifact.source,
      payload: artifact.payload,
      keywords: [],
      categories: ['other'],
      stats: artifact.stats,
    })
    expect(kept.sourceCommitSha).toBe(sha)

    // The next successful sweep re-pins it.
    const moved = 'deedbee'.padEnd(40, 'f')
    const repinned = kept.refreshedWith({
      displayName: kept.displayName,
      summary: kept.summary,
      source: kept.source,
      payload: kept.payload,
      keywords: [],
      categories: ['other'],
      stats: kept.stats,
      sourceCommitSha: moved,
    })
    expect(repinned.sourceCommitSha).toBe(moved)
  })
})

describe('Artifact crawl timestamps', () => {
  const earlier = new Date('2025-01-01T00:00:00.000Z')

  it('keeps lastmod stable when a crawl finds no public change', () => {
    const artifact = Artifact.create({ ...base, updatedAt: earlier, indexedAt: earlier })
    const refreshed = artifact.refreshedWith({
      displayName: artifact.displayName,
      summary: artifact.summary,
      source: artifact.source,
      payload: artifact.payload,
      keywords: artifact.keywords,
      categories: artifact.categories.map(String),
      stats: artifact.stats,
    })

    expect(refreshed.updatedAt).toEqual(earlier)
    expect(refreshed.indexedAt.getTime()).toBeGreaterThan(earlier.getTime())
  })

  it('advances lastmod when content visible on the artifact page changes', () => {
    const artifact = Artifact.create({ ...base, updatedAt: earlier, indexedAt: earlier })
    const refreshed = artifact.refreshedWith({
      displayName: artifact.displayName,
      summary: 'A changed bundle summary.',
      source: artifact.source,
      payload: artifact.payload,
      keywords: artifact.keywords,
      categories: artifact.categories.map(String),
      stats: artifact.stats,
    })

    expect(refreshed.updatedAt.getTime()).toBeGreaterThan(earlier.getTime())
  })
})
