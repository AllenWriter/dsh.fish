import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { DomainError } from '../../domain/shared/error.js'

export interface SitemapEntryDto {
  readonly id: string
  /** ISO 8601, which is what `<lastmod>` takes. */
  readonly updatedAt: string
}

export interface SitemapPageDto {
  readonly items: readonly SitemapEntryDto[]
  readonly total: number
  /** How many files the whole catalog needs at `SITEMAP_PAGE_SIZE` each. */
  readonly pageCount: number
}

/**
 * How many artifact URLs go in one sitemap file.
 *
 * The protocol allows 50,000 URLs or 50 MB uncompressed per file, whichever
 * comes first. Every entry here carries ten `xhtml:link` alternates, so the
 * byte limit binds long before the URL limit — and a Worker has to hold the
 * whole document in memory to send it. 5,000 keeps a file comfortably inside
 * both and keeps each response cheap to regenerate.
 */
export const SITEMAP_PAGE_SIZE = 5_000

/**
 * The catalog as a crawler needs to see it.
 *
 * Separate from `SearchArtifacts` on purpose. Search is bounded to a page a
 * human would read and rehydrates whole entities to render cards; a sitemap
 * wants every row in the catalog and two fields from each. Running one through
 * the other would either cap the sitemap at a browse page's worth of URLs or
 * make every browse page pay for a projection it does not use.
 */
export class ListSitemapEntries {
  constructor(private readonly artifacts: ArtifactRepository) {}

  async execute(pageNumber = 0): Promise<SitemapPageDto> {
    if (!Number.isInteger(pageNumber) || pageNumber < 0) {
      throw DomainError.invalid('Sitemap page must be a non-negative integer.', { pageNumber })
    }

    const result = await this.artifacts.listForSitemap({
      limit: SITEMAP_PAGE_SIZE,
      offset: pageNumber * SITEMAP_PAGE_SIZE,
    })

    return {
      items: result.items.map((entry) => ({
        id: entry.id as string,
        updatedAt: entry.updatedAt.toISOString(),
      })),
      total: result.total,
      // At least one file even when the catalog is empty: a sitemap index that
      // points at nothing is harder to diagnose than one pointing at an empty
      // but valid file.
      pageCount: Math.max(1, Math.ceil(result.total / SITEMAP_PAGE_SIZE)),
    }
  }
}
