import { describe, expect, it } from 'vitest'
import { SearchArtifacts } from './search-artifacts.js'
import type { ArtifactQuery, ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { page } from '../../domain/shared/pagination.js'
import type { SummaryTranslationRepository } from '../../domain/artifact/summary-translation.js'

/** No translations stored; every lookup comes back empty. */
function emptySummaryTranslations(): SummaryTranslationRepository {
  return {
    find: async () => undefined,
    listFor: async () => [],
    save: async () => {},
  }
}


/** Captures the query instead of answering it; the read result is irrelevant here. */
function capturingRepository() {
  const queries: ArtifactQuery[] = []
  const repository: ArtifactRepository = {
    findById: async () => undefined,
    search: async (query: ArtifactQuery) => {
      queries.push(query)
      return page([], 0, query.page)
    },
    countByKind: async () => [],
    save: async () => {},
    saveMany: async () => {},
    incrementInstalls: async () => {},
    recordMetricsSnapshot: async () => {},
    listIdsByOrigin: async () => [],
    listForSitemap: async () => {
      throw new Error('not used')
    },
    listForSnapshot: async () => {
      throw new Error('not used')
    },
    catalogStats: async () => {
      throw new Error('not used')
    },
  }
  return { repository, queries }
}

describe('SearchArtifacts sort resolution', () => {
  it('accepts the rising sort and passes it through', async () => {
    const { repository, queries } = capturingRepository()

    await new SearchArtifacts(repository, emptySummaryTranslations()).execute({ sort: 'rising' })

    expect(queries[0]?.sort).toBe('rising')
  })

  it('rejects a sort the catalog does not support', async () => {
    const { repository } = capturingRepository()

    await expect(new SearchArtifacts(repository, emptySummaryTranslations()).execute({ sort: 'magic' })).rejects.toMatchObject(
      { code: 'INVALID_ARGUMENT' },
    )
  })

  it('falls back from relevance to popular when there is no query text', async () => {
    const { repository, queries } = capturingRepository()

    await new SearchArtifacts(repository, emptySummaryTranslations()).execute({ sort: 'relevance' })

    expect(queries[0]?.sort).toBe('popular')
  })
})
