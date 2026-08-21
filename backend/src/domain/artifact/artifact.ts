import { DomainError } from '../shared/error.js'
import type { Slug } from '../shared/slug.js'
import { slug } from '../shared/slug.js'
import type { ArtifactKind } from './artifact-kind.js'
import type { ArtifactPayload } from './artifact-payload.js'
import { assertPayloadMatchesKind } from './artifact-payload.js'
import { normalizeCategories } from './category.js'
import { ogImageUrl } from './og-image-url.js'
import type { QualityScore } from './quality-score.js'
import { scoreArtifact } from './quality-score.js'
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
  /**
   * GitHub Social preview for the source repository, when one is known.
   *
   * Either an author-uploaded image or GitHub's generated Open Graph card.
   * Absent when the source has no GitHub repository to read a preview from.
   */
  readonly ogImageUrl?: string
  /**
   * The default-branch HEAD the indexer scanned, when the source is a git
   * repository. It is the same SHA `source.commit` pins installs to, lifted
   * into its own column so scan provenance ("what exactly did we look at") is
   * a field, not a JSON dig.
   */
  readonly sourceCommitSha?: string
  readonly stats: ArtifactStats
  /**
   * Stars gained over the trailing 7 / 30 days. Recomputed from the
   * `artifact_metrics` snapshots on every ingestion sweep; hub-derived, never
   * crawled. Kept out of `ArtifactStats` so a velocity change does not count
   * as a public-page change and churn the sitemap `lastmod`.
   */
  readonly starVelocity7d: number
  readonly starVelocity30d: number
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
    ogImageUrl?: string
    sourceCommitSha?: string
    stats?: Partial<ArtifactStats>
    starVelocity7d?: number
    starVelocity30d?: number
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
      ...(input.ogImageUrl === undefined ? {} : { ogImageUrl: ogImageUrl(input.ogImageUrl) }),
      ...(input.sourceCommitSha === undefined ? {} : { sourceCommitSha: input.sourceCommitSha }),
      stats: {
        stars: input.stats?.stars ?? 0,
        downloads: input.stats?.downloads ?? 0,
        installs: input.stats?.installs ?? 0,
      },
      starVelocity7d: input.starVelocity7d ?? 0,
      starVelocity30d: input.starVelocity30d ?? 0,
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
  get ogImageUrl(): string | undefined {
    return this.props.ogImageUrl
  }
  get sourceCommitSha(): string | undefined {
    return this.props.sourceCommitSha
  }
  get stats(): ArtifactStats {
    return this.props.stats
  }
  get starVelocity7d(): number {
    return this.props.starVelocity7d
  }
  get starVelocity30d(): number {
    return this.props.starVelocity30d
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
   * signal the hub can actually observe rather than copy. Stored on
   * `artifacts.popularity` so a listing `ORDER BY` is a column scan, not an
   * expression over every matching row.
   */
  get popularity(): number {
    return listRank(this.props.stats, this.verified, this.props.deprecated)
  }

  /**
   * The public, reproducible quality score behind the `score` / `grade` /
   * `maintenanceStatus` DTO fields. The formula lives in `quality-score.ts`
   * and is published verbatim by `GET /api/v1/scoring`.
   */
  get qualityScore(): QualityScore {
    return scoreArtifact(
      {
        stats: this.props.stats,
        verified: this.verified,
        hasReadme: this.props.readmeMarkdown !== undefined,
        hasLicense: this.props.license !== undefined,
        hasAuthor: this.props.author !== undefined,
        deprecated: this.props.deprecated,
        updatedAt: this.props.updatedAt,
      },
      new Date(),
    )
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
      /**
       * `string` sets it, `null` clears it, omitted leaves the stored URL.
       * Omitted is for a crawl that did not look; `null` is for a source that
       * has no GitHub repository to read a preview from.
       */
      readonly ogImageUrl?: string | null
      /**
       * Same tri-state as `ogImageUrl`: `string` re-pins the scan provenance,
       * `null` clears it, omitted keeps the stored SHA (a sweep whose commit
       * resolution failed did not look, so it must not wipe what an earlier
       * sweep pinned).
       */
      readonly sourceCommitSha?: string | null
    } & Partial<Pick<ArtifactProps, 'license' | 'author' | 'readmeMarkdown' | 'deprecated'>>,
  ): Artifact {
    assertPayloadMatchesKind(this.props.kind, snapshot.payload)
    const { ogImageUrl: previousOg, sourceCommitSha: previousSha, ...rest } = this.props
    const nextOg =
      snapshot.ogImageUrl === undefined
        ? previousOg
        : snapshot.ogImageUrl === null
          ? undefined
          : ogImageUrl(snapshot.ogImageUrl)
    const nextSha =
      snapshot.sourceCommitSha === undefined
        ? previousSha
        : (snapshot.sourceCommitSha ?? undefined)
    const refreshedAt = new Date()
    const next = {
      ...rest,
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
      ...(nextOg === undefined ? {} : { ogImageUrl: nextOg }),
      ...(nextSha === undefined ? {} : { sourceCommitSha: nextSha }),
      ...(snapshot.deprecated === undefined ? {} : { deprecated: snapshot.deprecated }),
      indexedAt: refreshedAt,
    }

    // `indexedAt` records that the crawler checked the source. `updatedAt` is
    // exposed as sitemap `lastmod`, so it may only advance when the public page
    // actually changed. Updating both on every sweep made the entire catalog
    // look freshly modified every few hours and taught crawlers to distrust the
    // sitemap signal.
    return new Artifact({
      ...next,
      updatedAt: publicArtifactChanged(this.props, next) ? refreshedAt : this.props.updatedAt,
    })
  }

  toProps(): ArtifactProps {
    return this.props
  }
}

type PublicProps = Omit<ArtifactProps, 'updatedAt'> | ArtifactProps

const publicFields = (value: PublicProps) => ({
  displayName: value.displayName,
  summary: value.summary,
  source: value.source,
  payload: value.payload,
  keywords: value.keywords,
  categories: value.categories,
  license: value.license,
  author: value.author,
  readmeMarkdown: value.readmeMarkdown,
  ogImageUrl: value.ogImageUrl,
  deprecated: value.deprecated,
})

function publicArtifactChanged(
  previous: ArtifactProps,
  next: Omit<ArtifactProps, 'updatedAt'>,
): boolean {
  const withStats = (value: PublicProps) => ({ ...publicFields(value), stats: value.stats })
  return JSON.stringify(withStats(previous)) !== JSON.stringify(withStats(next))
}

/**
 * Sort key for catalog listings. The D1 `artifacts.popularity` column stores
 * this number; the SQL that writes it must stay identical.
 */
export function listRank(
  stats: ArtifactStats,
  verified: boolean,
  deprecated: boolean,
): number {
  const base = stats.installs * 3 + stats.stars + stats.downloads / 10
  const trust = verified ? 1.25 : 1
  const decay = deprecated ? 0.1 : 1
  return base * trust * decay
}

/**
 * Whether a refresh changed the stored catalog content, ignoring popularity
 * stats. `sourceCommitSha` counts as content because it pins scan provenance;
 * `stats` does not, because stars and downloads move on nearly every sweep and
 * are kept fresh by the metrics snapshot alone.
 */
export function artifactContentChanged(previous: ArtifactProps, next: ArtifactProps): boolean {
  const withProvenance = (value: ArtifactProps) => ({
    ...publicFields(value),
    sourceCommitSha: value.sourceCommitSha,
  })
  return JSON.stringify(withProvenance(previous)) !== JSON.stringify(withProvenance(next))
}

function normalizeKeywords(raw: readonly string[]): readonly string[] {
  const seen = new Set<string>()
  for (const keyword of raw) {
    const value = keyword.trim().toLowerCase()
    if (value !== '' && value.length <= 50) seen.add(value)
  }
  return [...seen].slice(0, 30)
}
