import type { Page, PageRequest } from '../shared/pagination.js'
import type { Slug } from '../shared/slug.js'
import type { Artifact } from './artifact.js'
import type { ArtifactKind } from './artifact-kind.js'

export type ArtifactSort = 'relevance' | 'popular' | 'recent' | 'name'

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
 * Port owned by the domain; implemented in `infrastructure` over D1.
 */
export interface ArtifactRepository {
  findById(id: Slug): Promise<Artifact | undefined>
  search(query: ArtifactQuery): Promise<Page<Artifact>>
  countByKind(): Promise<readonly KindCount[]>
  save(artifact: Artifact): Promise<void>
  saveMany(artifacts: readonly Artifact[]): Promise<void>
  incrementInstalls(id: Slug, by: number): Promise<void>
  /** Ids already indexed from a given origin, so a crawl can diff rather than re-insert. */
  listIdsByOrigin(origin: string): Promise<readonly Slug[]>
}
