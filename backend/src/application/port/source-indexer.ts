import type { ArtifactKind } from '../../domain/artifact/artifact-kind.js'
import type { ArtifactAuthor } from '../../domain/artifact/artifact.js'
import type { ArtifactPayload } from '../../domain/artifact/artifact-payload.js'
import type { SourceRef } from '../../domain/artifact/source-ref.js'

/**
 * One indexed source, normalized to whatever `Artifact.create` needs.
 *
 * Every indexer produces this same shape, so a GitHub crawl, an npm crawl and
 * an approved user submission all land as the same kind of row.
 */
export interface IndexedSnapshot {
  readonly id: string
  readonly kind: ArtifactKind
  readonly displayName: string
  readonly summary: string
  readonly source: SourceRef
  readonly payload: ArtifactPayload
  readonly keywords: readonly string[]
  readonly categories: readonly string[]
  readonly license?: string
  readonly author?: ArtifactAuthor
  /**
   * The source host's own id for whoever owns this source — GitHub's numeric
   * user or organisation id. It is what an OAuth link records, so it is what
   * an ownership claim can be checked against; npm has no equivalent, and
   * leaves it unset.
   */
  readonly sourceOwnerId?: string
  readonly readmeMarkdown?: string
  /**
   * GitHub Social preview URL when the source has a GitHub repository.
   * `null` means the indexer looked and there is none; omitted means it did
   * not look, so a refresh must keep whatever is already stored.
   */
  readonly ogImageUrl?: string | null
  readonly stats: { readonly stars: number; readonly downloads: number }
  readonly deprecated?: boolean
}

export interface IndexRequest {
  readonly kindHint?: ArtifactKind
  readonly source: SourceRef
}

/**
 * Port for a place plugins can be discovered. Implemented in `infrastructure`
 * against the GitHub and npm APIs.
 */
export interface SourceIndexer {
  readonly origin: 'npm' | 'github'
  /** Sweep the source for candidates. Yields only rows the harness would load. */
  discover(limit: number): Promise<readonly IndexedSnapshot[]>
  /** Index one known reference, e.g. from a user submission. */
  indexOne(request: IndexRequest): Promise<IndexedSnapshot | undefined>
}

/** Fetches a text resource. Kept as a port so use cases stay testable offline. */
export interface HttpTextFetcher {
  fetchText(url: string, headers?: Readonly<Record<string, string>>): Promise<string | undefined>
}

/** Generates opaque ids. A port because `crypto.randomUUID` is a runtime detail. */
export interface IdGenerator {
  next(): string
}
