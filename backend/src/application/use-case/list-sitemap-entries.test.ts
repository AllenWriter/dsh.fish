import { describe, expect, it } from 'vitest'
import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { slug } from '../../domain/shared/slug.js'
import { ListSitemapEntries, SITEMAP_PAGE_SIZE } from './list-sitemap-entries.js'

function repositoryWith(total: number) {
  const requests: { limit: number; offset: number }[] = []
  const repository = {
    listForSitemap: async (request: { limit: number; offset: number }) => {
      requests.push(request)
      const available = Math.max(0, Math.min(request.limit, total - request.offset))
      return {
        items: Array.from({ length: available }, (_, index) => ({
          id: slug(`plugin-${request.offset + index}`),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        })),
        total,
        ...request,
      }
    },
  } as Pick<ArtifactRepository, 'listForSitemap'>

  return { repository: repository as ArtifactRepository, requests }
}

describe('ListSitemapEntries', () => {
  it('paginates the complete public catalog without dropping the final partial file', async () => {
    const total = SITEMAP_PAGE_SIZE * 2 + 17
    const { repository, requests } = repositoryWith(total)
    const useCase = new ListSitemapEntries(repository)

    const pages = await Promise.all([useCase.execute(0), useCase.execute(1), useCase.execute(2)])

    expect(pages.map((page) => page.items.length)).toEqual([
      SITEMAP_PAGE_SIZE,
      SITEMAP_PAGE_SIZE,
      17,
    ])
    expect(pages.every((page) => page.total === total && page.pageCount === 3)).toBe(true)
    expect(requests).toEqual([
      { limit: SITEMAP_PAGE_SIZE, offset: 0 },
      { limit: SITEMAP_PAGE_SIZE, offset: SITEMAP_PAGE_SIZE },
      { limit: SITEMAP_PAGE_SIZE, offset: SITEMAP_PAGE_SIZE * 2 },
    ])
  })
})
