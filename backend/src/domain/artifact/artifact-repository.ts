import type { Page, PageRequest } from '../shared/pagination.js'
import type { Slug } from '../shared/slug.js'
import type { Artifact } from './artifact.js'
import type { ArtifactKind } from './artifact-kind.js'

export type ArtifactSort = 'relevance' | 'popular' | 'recent' | 'name' | 'rising'

export interface ArtifactQuery {
  readonly text?: string
  readonly kinds?: readonly ArtifactKind[]
  readonly categories?: readonly Slug[]
  readonly keywords?: readonly string[]
  readonly verifiedOnly?: boolean
  readonly includeDeprecated?: boolean
  readonly ownerAccountId?: string
  readonly sort: ArtifactSort
  readonly page: PageRequest
}

export interface KindCount {
  readonly kind: ArtifactKind
  readonly count: number
}

/**
 * The projection a sitemap needs: an id to build a URL from and the timestamp
 * that decides whether a crawler bothers re-reading it.
 *
 * Deliberately not an `Artifact`. A sitemap covers the whole catalog, not one
 * page of it, and rehydrating thousands of entities — payload, readme and all —
 * to emit two fields each would cost far more than the document it produces.
 */
export interface SitemapEntry {
  readonly id: Slug
  readonly updatedAt: Date
}

/**
 * The cheap aggregate the catalog snapshot's data version is derived from.
 *
 * Every field a public read can observe is either covered here or bumps
 * `updatedAt` when it changes (see `Artifact.refreshedWith`), so two reads with
 * equal stats are guaranteed to serialize the same catalog — which is what lets
 * the version endpoint answer without reading a single artifact row.
 */
export interface CatalogStats {
  readonly artifactCount: number
  /** Milliseconds since epoch; 0 when the catalog is empty. */
  readonly maxUpdatedAtMs: number
  readonly installs: number
  readonly stars: number
  readonly downloads: number
}

/**
 * Port owned by the domain; implemented in `infrastructure` over D1.
 */
export interface ArtifactRepository {
  findById(id: Slug): Promise<Artifact | undefined>
  search(query: ArtifactQuery): Promise<Page<Artifact>>
  countByKind(): Promise<readonly KindCount[]>
  save(artifact: Artifact): Promise<void>
  saveMany(artifacts: readonly Artifact[]): Promise<void>
  incrementInstalls(id: Slug, by: number): Promise<void>
  /**
   * Append one metrics snapshot for the artifact and recompute its stored
   * star-velocity windows. Called once per artifact per ingestion sweep, so
   * `artifact_metrics` grows at cron cadence.
   */
  recordMetricsSnapshot(artifact: Artifact): Promise<void>
  /** Ids already indexed from a given origin, so a crawl can diff rather than re-insert. */
  listIdsByOrigin(origin: string): Promise<readonly Slug[]>
  /**
   * Every listable artifact, oldest-updated last, for the sitemap.
   *
   * Ordered by `updatedAt` descending and paged, so the first sitemap file holds
   * what changed most recently — which is what a crawler that only fetches one
   * file should see.
   */
  listForSitemap(page: PageRequest): Promise<Page<SitemapEntry>>
  /**
   * Every public artifact, ordered by id, for the full-catalog snapshot.
   *
   * Ordered so the serialized document is canonical: the same catalog always
   * produces the same bytes, which is what makes the snapshot's data version
   * (and ETag) stable. Deprecated rows are excluded — they still resolve by id,
   * but they are not part of the public catalog.
   */
  listForSnapshot(): Promise<readonly Artifact[]>
  /** The aggregate behind the snapshot's data version; reads no artifact rows. */
  catalogStats(): Promise<CatalogStats>
}
