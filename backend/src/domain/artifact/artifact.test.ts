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
})
