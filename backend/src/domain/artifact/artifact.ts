import { DomainError } from '../shared/error.js'
import type { Slug } from '../shared/slug.js'
import { slug } from '../shared/slug.js'
import type { ArtifactKind } from './artifact-kind.js'
import type { ArtifactPayload } from './artifact-payload.js'
import { assertPayloadMatchesKind } from './artifact-payload.js'
import { normalizeCategories } from './category.js'
import type { SourceRef } from './source-ref.js'

export interface ArtifactStats {
  /** Stars on the source repository, when the source is a repository. */
  readonly stars: number
  /** Weekly npm downloads, when the source is a package. */
  readonly downloads: number
  /** Installs resolved through this hub. The only number the hub itself owns. */
  readonly installs: number
}

export interface ArtifactAuthor {
  readonly name: string
  readonly url?: string
}

export interface ArtifactProps {
  readonly id: Slug
  readonly kind: ArtifactKind
  readonly displayName: string
  readonly summary: string
  readonly source: SourceRef
  readonly payload: ArtifactPayload
  readonly keywords: readonly string[]
  readonly categories: readonly Slug[]
  readonly license?: string
  readonly author?: ArtifactAuthor
  readonly readmeMarkdown?: string
  readonly stats: ArtifactStats
  /** Set once a signed-in account has proven it controls the source. */
  readonly ownerAccountId?: string
  readonly publishedAt: Date
  readonly updatedAt: Date
  readonly indexedAt: Date
  readonly deprecated: boolean
}

const MAX_SUMMARY = 300

/**
 * The catalog aggregate. One row of the hub, whatever its kind.
 *
 * Invariants live here rather than in the HTTP layer so the crawler and a user
 * submission cannot land differently shaped rows for the same kind.
 */
export class Artifact {
  private constructor(private readonly props: ArtifactProps) {}

  static create(input: {
    id: string
    kind: ArtifactKind
    displayName: string
    summary: string
    source: SourceRef
    payload: ArtifactPayload
    keywords?: readonly string[]
    categories?: readonly string[]
    license?: string
    author?: ArtifactAuthor
    readmeMarkdown?: string
    stats?: Partial<ArtifactStats>
    ownerAccountId?: string
    publishedAt?: Date
    updatedAt?: Date
    indexedAt?: Date
    deprecated?: boolean
  }): Artifact {
    const displayName = input.displayName.trim()
    if (displayName === '') {
      throw DomainError.invalid('An artifact needs a display name.')
    }
    const summary = input.summary.trim()
    if (summary === '') {
      throw DomainError.invalid('An artifact needs a summary.')
    }
    if (summary.length > MAX_SUMMARY) {
      throw DomainError.invalid(`A summary may not exceed ${MAX_SUMMARY} characters.`, {
        length: summary.length,
      })
    }
    assertPayloadMatchesKind(input.kind, input.payload)

    const now = new Date()
    return new Artifact({
      id: slug(input.id),
      kind: input.kind,
      displayName,
      summary,
      source: input.source,
      payload: input.payload,
      keywords: normalizeKeywords(input.keywords ?? []),
      // Advisory input, so it is reduced rather than rejected: a category name
      // outside the taxonomy must not take the whole artifact down with it.
      categories: normalizeCategories(input.categories ?? []),
      ...(input.license === undefined ? {} : { license: input.license }),
      ...(input.author === undefined ? {} : { author: input.author }),
      ...(input.readmeMarkdown === undefined ? {} : { readmeMarkdown: input.readmeMarkdown }),
      stats: {
        stars: input.stats?.stars ?? 0,
        downloads: input.stats?.downloads ?? 0,
        installs: input.stats?.installs ?? 0,
      },
      ...(input.ownerAccountId === undefined ? {} : { ownerAccountId: input.ownerAccountId }),
      publishedAt: input.publishedAt ?? now,
      updatedAt: input.updatedAt ?? now,
      indexedAt: input.indexedAt ?? now,
      deprecated: input.deprecated ?? false,
    })
  }

  static rehydrate(props: ArtifactProps): Artifact {
    return new Artifact(props)
  }

  get id(): Slug {
    return this.props.id
  }
  get kind(): ArtifactKind {
    return this.props.kind
  }
  get displayName(): string {
    return this.props.displayName
  }
  get summary(): string {
    return this.props.summary
  }
  get source(): SourceRef {
    return this.props.source
  }
  get payload(): ArtifactPayload {
    return this.props.payload
  }
  get keywords(): readonly string[] {
    return this.props.keywords
  }
  get categories(): readonly Slug[] {
    return this.props.categories
  }
  get license(): string | undefined {
    return this.props.license
  }
  get author(): ArtifactAuthor | undefined {
    return this.props.author
  }
  get readmeMarkdown(): string | undefined {
    return this.props.readmeMarkdown
  }
  get stats(): ArtifactStats {
    return this.props.stats
  }
  get ownerAccountId(): string | undefined {
    return this.props.ownerAccountId
  }
  get publishedAt(): Date {
    return this.props.publishedAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }
  get indexedAt(): Date {
    return this.props.indexedAt
  }
  get deprecated(): boolean {
    return this.props.deprecated
  }

  /** An artifact is verified once an account has proven control of its source. */
  get verified(): boolean {
    return this.props.ownerAccountId !== undefined
  }

  /**
   * Ranking weight used to break ties in search.
   *
   * Verified rows outrank unverified ones, and installs resolved through this
   * hub count for more than upstream popularity, because they are the only
   * signal the hub can actually observe rather than copy.
   */
  get popularity(): number {
    const base = this.props.stats.installs * 3 + this.props.stats.stars + this.props.stats.downloads / 10
    const trust = this.verified ? 1.25 : 1
    const decay = this.props.deprecated ? 0.1 : 1
    return base * trust * decay
  }

  claimedBy(accountId: string): Artifact {
    if (this.props.ownerAccountId !== undefined && this.props.ownerAccountId !== accountId) {
      throw DomainError.conflict('This artifact is already claimed by another account.', {
        artifactId: this.props.id,
      })
    }
    return new Artifact({ ...this.props, ownerAccountId: accountId, updatedAt: new Date() })
  }

  /** Fold a freshly crawled snapshot over the stored row, keeping hub-owned state. */
  refreshedWith(
    snapshot: Pick<
      ArtifactProps,
      'displayName' | 'summary' | 'source' | 'payload' | 'keywords' | 'stats'
    > & {
      /** Re-read from the source each sweep, like keywords, not frozen at creation. */
      readonly categories: readonly string[]
    } & Partial<Pick<ArtifactProps, 'license' | 'author' | 'readmeMarkdown' | 'deprecated'>>,
  ): Artifact {
    assertPayloadMatchesKind(this.props.kind, snapshot.payload)
    return new Artifact({
      ...this.props,
      displayName: snapshot.displayName,
      summary: snapshot.summary,
      source: snapshot.source,
      payload: snapshot.payload,
      keywords: normalizeKeywords(snapshot.keywords),
      categories: normalizeCategories(snapshot.categories),
      stats: {
        stars: snapshot.stats.stars,
        downloads: snapshot.stats.downloads,
        // Installs are the hub's own counter; a crawl never overwrites it.
        installs: this.props.stats.installs,
      },
      ...(snapshot.license === undefined ? {} : { license: snapshot.license }),
      ...(snapshot.author === undefined ? {} : { author: snapshot.author }),
      ...(snapshot.readmeMarkdown === undefined
        ? {}
        : { readmeMarkdown: snapshot.readmeMarkdown }),
      ...(snapshot.deprecated === undefined ? {} : { deprecated: snapshot.deprecated }),
      updatedAt: new Date(),
      indexedAt: new Date(),
    })
  }

  toProps(): ArtifactProps {
    return this.props
  }
}

function normalizeKeywords(raw: readonly string[]): readonly string[] {
  const seen = new Set<string>()
  for (const keyword of raw) {
    const value = keyword.trim().toLowerCase()
    if (value !== '' && value.length <= 50) seen.add(value)
  }
  return [...seen].slice(0, 30)
}
