import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { DomainError } from '../../domain/shared/error.js'

export interface SitemapEntryDto {
  readonly id: string
  /** ISO 8601. `xml.ts` emits this as W3C Datetime `<lastmod>`. */
  readonly updatedAt: string
  readonly locales: readonly { locale: string; updatedAt: string }[]
}

export interface SitemapPageDto {
  readonly items: readonly SitemapEntryDto[]
  readonly total: number
  /** How many files the whole catalog needs at `SITEMAP_PAGE_SIZE` each. */
  readonly pageCount: number
}

/**
 * How many artifacts go in one sitemap file.
 *
 * sitemaps.org and Google cap a file at 50,000 URLs or 50 MB uncompressed.
 * Each artifact expands to one `<url>` per locale plus a full `xhtml:link`
 * alternate set, so the byte limit binds first. A Worker also has to hold
 * the document in memory. Production measured about 5.3 KB per artifact
 * at six locales; 1,000 rows is ~5 MB / 6,000 URLs — well inside the cap,
 * small enough for Search Console's fetcher (a 13 MB / 2,500-row file was
 * reported unreadable), and still one hop from the index for the whole
 * catalog.
 */
export const SITEMAP_PAGE_SIZE = 1_000

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
  constructor(
    private readonly artifacts: ArtifactRepository,
    private readonly supportedLocales: readonly string[] = ['en'],
    private readonly localeGating = false,
  ) {}

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
        locales: this.localeGating
          ? [
              { locale: 'en', updatedAt: entry.updatedAt.toISOString() },
              ...(entry.locales ?? []).map((locale) => ({
                locale: locale.locale,
                updatedAt: locale.updatedAt.toISOString(),
              })),
            ]
          : this.supportedLocales.map((locale) => ({
              locale,
              updatedAt: entry.updatedAt.toISOString(),
            })),
      })),
      total: result.total,
      // At least one file even when the catalog is empty: a sitemap index that
      // points at nothing is harder to diagnose than one pointing at an empty
      // but valid file.
      pageCount: Math.max(1, Math.ceil(result.total / SITEMAP_PAGE_SIZE)),
    }
  }
}
