import { describe, expect, it } from 'vitest'
import { IngestCatalog } from './ingest-catalog.js'
import type { Artifact } from '../../domain/artifact/artifact.js'
import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import type { Slug } from '../../domain/shared/slug.js'
import { npmSource } from '../../domain/artifact/source-ref.js'
import type { IndexedSnapshot, SourceIndexer } from '../port/source-indexer.js'

/** Only what the sweep touches. The rest of the port is never reached here. */
function memoryRepository() {
  const rows = new Map<string, Artifact>()
  const repository: ArtifactRepository = {
    findById: async (id: Slug) => rows.get(String(id)),
    search: async () => {
      throw new Error('not used')
    },
    countByKind: async () => [],
    save: async (artifact: Artifact) => {
      rows.set(String(artifact.id), artifact)
    },
    saveMany: async () => {},
    incrementInstalls: async () => {},
    listIdsByOrigin: async () => [],
    listForSitemap: async () => {
      throw new Error('not used')
    },
  }
  return { repository, rows }
}

function snapshot(overrides: Partial<IndexedSnapshot> = {}): IndexedSnapshot {
  return {
    id: 'dsh-hello-plugin',
    kind: 'bundle',
    displayName: 'dsh-hello-plugin',
    summary: 'A bundle.',
    source: npmSource('dsh-hello-plugin', '1.0.0'),
    payload: { kind: 'bundle', requiresBuild: false },
    keywords: [],
    categories: [],
    stats: { stars: 0, downloads: 0 },
    ...overrides,
  }
}

function indexer(origin: 'github' | 'npm', snapshots: readonly IndexedSnapshot[]) {
  const limits: number[] = []
  const source: SourceIndexer = {
    origin,
    discover: async (limit: number) => {
      limits.push(limit)
      return snapshots
    },
    indexOne: async () => undefined,
  }
  return { source, limits }
}

describe('IngestCatalog', () => {
  it('lands a row whose declared category is not in the taxonomy', async () => {
    // The sweep used to count this as `skipped`: the artifact was dropped
    // wholesale because of one advisory string.
    const { repository, rows } = memoryRepository()
    const github = indexer('github', [snapshot({ categories: ['AI Coding'] })])

    const report = await new IngestCatalog(repository, [github.source]).execute()

    expect(report).toMatchObject({ scanned: 1, created: 1, skipped: 0 })
    expect(rows.get('dsh-hello-plugin')?.categories).toEqual(['other'])
  })

  it('re-applies categories to a row it already has', async () => {
    const { repository, rows } = memoryRepository()
    const first = indexer('github', [snapshot({ categories: [] })])
    await new IngestCatalog(repository, [first.source]).execute()
    expect(rows.get('dsh-hello-plugin')?.categories).toEqual(['other'])

    // The author adds `dsh.hub.categories` and the next sweep picks it up.
    const second = indexer('github', [snapshot({ categories: ['devops'] })])
    const report = await new IngestCatalog(repository, [second.source]).execute()

    expect(report).toMatchObject({ updated: 1, created: 0 })
    expect(rows.get('dsh-hello-plugin')?.categories).toEqual(['devops'])
  })

  it('spends a different candidate budget at each origin', async () => {
    const { repository } = memoryRepository()
    const github = indexer('github', [])
    const npm = indexer('npm', [])

    await new IngestCatalog(repository, [github.source, npm.source]).execute({
      limitPerSource: 100,
      limitByOrigin: { github: 200 },
    })

    expect(github.limits).toEqual([200])
    expect(npm.limits).toEqual([100])
  })

})
