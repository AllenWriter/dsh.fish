import { and, asc, desc, eq, inArray, like, lte, or, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { Artifact } from '../../domain/artifact/artifact.js'
import type { ArtifactProps } from '../../domain/artifact/artifact.js'
import { artifactKind } from '../../domain/artifact/artifact-kind.js'
import type { ArtifactPayload } from '../../domain/artifact/artifact-payload.js'
import type {
  ArtifactQuery,
  ArtifactRepository,
  CatalogStats,
  KindCount,
  SitemapEntry,
} from '../../domain/artifact/artifact-repository.js'
import { starVelocity } from '../../domain/artifact/quality-score.js'
import type { MetricsSnapshot } from '../../domain/artifact/quality-score.js'
import type { SourceRef } from '../../domain/artifact/source-ref.js'
import type { Page, PageRequest } from '../../domain/shared/pagination.js'
import { page } from '../../domain/shared/pagination.js'
import type { Slug } from '../../domain/shared/slug.js'
import { slug } from '../../domain/shared/slug.js'
import { artifactCategories, artifactMetrics, artifacts, artifactSearch } from './catalog-schema.js'
import * as schema from './schema.js'

type Db = DrizzleD1Database<typeof schema>
type ArtifactRow = typeof artifacts.$inferSelect
/** One statement in a D1 batch. Drizzle types each builder differently, so the
 *  heterogeneous list needs the shared base type to stay assignable. */
type BatchStatement = BatchItem<'sqlite'>

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * D1 implementation of the catalog port.
 *
 * D1 has no server-side transactions across statements, so multi-table writes
 * go through `db.batch`, which D1 does apply atomically. That matters for the
 * artifact + categories + search-index triple: a half-applied write would leave
 * a row that browses but never appears in search.
 */
export class D1ArtifactRepository implements ArtifactRepository {
  constructor(private readonly db: Db) {}

  async findById(id: Slug): Promise<Artifact | undefined> {
    const rows = await this.db.select().from(artifacts).where(eq(artifacts.id, id)).limit(1)
    const row = rows[0]
    return row ? toEntity(row) : undefined
  }

  async search(query: ArtifactQuery): Promise<Page<Artifact>> {
    const conditions = []

    if (query.kinds && query.kinds.length > 0) {
      conditions.push(inArray(artifacts.kind, [...query.kinds]))
    }
    if (query.verifiedOnly === true) {
      conditions.push(sql`${artifacts.ownerAccountId} is not null`)
    }
    if (query.includeDeprecated !== true) {
      conditions.push(eq(artifacts.deprecated, false))
    }
    if (query.ownerAccountId !== undefined) {
      conditions.push(eq(artifacts.ownerAccountId, query.ownerAccountId))
    }
    if (query.text !== undefined) {
      const needle = `%${query.text.toLowerCase()}%`
      conditions.push(
        or(
          like(sql`lower(${artifacts.displayName})`, needle),
          like(sql`lower(${artifacts.summary})`, needle),
          like(sql`lower(${artifacts.id})`, needle),
          sql`exists (select 1 from ${artifactSearch} where ${artifactSearch.artifactId} = ${artifacts.id} and ${artifactSearch.haystack} like ${needle})`,
        ),
      )
    }
    if (query.categories && query.categories.length > 0) {
      conditions.push(
        sql`exists (select 1 from ${artifactCategories} where ${artifactCategories.artifactId} = ${artifacts.id} and ${artifactCategories.categoryId} in ${[...query.categories]})`,
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [countRow] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(artifacts)
      .where(where)

    const rows = await this.db
      .select()
      .from(artifacts)
      .where(where)
      .orderBy(...orderFor(query))
      .limit(query.page.limit)
      .offset(query.page.offset)

    return page(rows.map(toEntity), Number(countRow?.total ?? 0), query.page)
  }

  async countByKind(): Promise<readonly KindCount[]> {
    const rows = await this.db
      .select({ kind: artifacts.kind, count: sql<number>`count(*)` })
      .from(artifacts)
      .where(eq(artifacts.deprecated, false))
      .groupBy(artifacts.kind)
    return rows.map((row) => ({ kind: artifactKind(row.kind), count: Number(row.count) }))
  }

  async save(artifact: Artifact): Promise<void> {
    await this.runBatch(this.writeStatements(artifact))
  }

  async saveMany(list: readonly Artifact[]): Promise<void> {
    if (list.length === 0) return
    const statements = list.flatMap((artifact) => this.writeStatements(artifact))
    // D1 caps the number of statements in one batch; chunk so a large crawl
    // cannot exceed it.
    for (let index = 0; index < statements.length; index += 50) {
      await this.runBatch(statements.slice(index, index + 50))
    }
  }

  /** `db.batch` demands a non-empty tuple; an empty slice is simply a no-op. */
  private async runBatch(statements: BatchStatement[]): Promise<void> {
    const [first, ...rest] = statements
    if (!first) return
    await this.db.batch([first, ...rest])
  }

  async incrementInstalls(id: Slug, by: number): Promise<void> {
    await this.db
      .update(artifacts)
      .set({ installs: sql`${artifacts.installs} + ${by}` })
      .where(eq(artifacts.id, id))
  }

  async recordMetricsSnapshot(artifact: Artifact): Promise<void> {
    const props = artifact.toProps()
    const now = new Date()

    // The anchor for a window is the most recent snapshot taken at least that
    // long ago; the rule itself lives in the domain (`starVelocity`) so the
    // SQL below only fetches candidates.
    const anchorHistory = async (windowDays: number): Promise<readonly MetricsSnapshot[]> => {
      const cutoff = new Date(now.getTime() - windowDays * DAY_MS)
      return this.db
        .select({ stars: artifactMetrics.stars, capturedAt: artifactMetrics.capturedAt })
        .from(artifactMetrics)
        .where(and(eq(artifactMetrics.artifactId, props.id as string), lte(artifactMetrics.capturedAt, cutoff)))
        .orderBy(desc(artifactMetrics.capturedAt))
        .limit(1)
    }
    const [history7d, history30d] = await Promise.all([anchorHistory(7), anchorHistory(30)])

    const snapshot = this.db
      .insert(artifactMetrics)
      .values({
        artifactId: props.id as string,
        stars: props.stats.stars,
        downloads: props.stats.downloads,
        installs: props.stats.installs,
        capturedAt: now,
      })
      // Two sweeps inside the same millisecond must not fail the second one.
      .onConflictDoNothing()
    const velocities = this.db
      .update(artifacts)
      .set({
        starVelocity7d: starVelocity(props.stats.stars, history7d, 7, now),
        starVelocity30d: starVelocity(props.stats.stars, history30d, 30, now),
      })
      .where(eq(artifacts.id, props.id as string))
    await this.db.batch([snapshot, velocities])
  }

  async listForSitemap(request: PageRequest): Promise<Page<SitemapEntry>> {
    // A deprecated artifact still resolves and is still linked from the pages
    // that reference it, but it is not something to invite a crawler to.
    const where = eq(artifacts.deprecated, false)

    const [countRow] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(artifacts)
      .where(where)

    const rows = await this.db
      .select({ id: artifacts.id, updatedAt: artifacts.updatedAt })
      .from(artifacts)
      .where(where)
      .orderBy(desc(artifacts.updatedAt))
      .limit(request.limit)
      .offset(request.offset)

    // `updated_at` is a `timestamp_ms` column, so Drizzle hands back a Date.
    return page(
      rows.map((row) => ({ id: slug(row.id), updatedAt: row.updatedAt })),
      Number(countRow?.total ?? 0),
      request,
    )
  }

  async listIdsByOrigin(origin: string): Promise<readonly Slug[]> {
    const rows = await this.db
      .select({ id: artifacts.id })
      .from(artifacts)
      .where(eq(artifacts.sourceOrigin, origin))
    return rows.map((row) => slug(row.id))
  }

  async listForSnapshot(): Promise<readonly Artifact[]> {
    const rows = await this.db
      .select()
      .from(artifacts)
      .where(eq(artifacts.deprecated, false))
      .orderBy(asc(artifacts.id))
    return rows.map(toEntity)
  }

  async catalogStats(): Promise<CatalogStats> {
    const [row] = await this.db
      .select({
        artifactCount: sql<number>`count(*)`,
        // `updated_at` is a `timestamp_ms` column, so inside a raw aggregate it
        // is the stored integer milliseconds, not a Date.
        maxUpdatedAtMs: sql<number>`coalesce(max(${artifacts.updatedAt}), 0)`,
        installs: sql<number>`coalesce(sum(${artifacts.installs}), 0)`,
        stars: sql<number>`coalesce(sum(${artifacts.stars}), 0)`,
        downloads: sql<number>`coalesce(sum(${artifacts.downloads}), 0)`,
      })
      .from(artifacts)
      .where(eq(artifacts.deprecated, false))
    return {
      artifactCount: Number(row?.artifactCount ?? 0),
      maxUpdatedAtMs: Number(row?.maxUpdatedAtMs ?? 0),
      installs: Number(row?.installs ?? 0),
      stars: Number(row?.stars ?? 0),
      downloads: Number(row?.downloads ?? 0),
    }
  }

  private writeStatements(artifact: Artifact): BatchStatement[] {
    const props = artifact.toProps()
    const values = {
      id: props.id as string,
      kind: props.kind,
      displayName: props.displayName,
      summary: props.summary,
      source: props.source,
      sourceOrigin: props.source.origin,
      sourceCommitSha: props.sourceCommitSha ?? null,
      payload: props.payload,
      keywords: props.keywords,
      categories: props.categories.map(String),
      license: props.license ?? null,
      authorName: props.author?.name ?? null,
      authorUrl: props.author?.url ?? null,
      readmeMarkdown: props.readmeMarkdown ?? null,
      ogImageUrl: props.ogImageUrl ?? null,
      stars: props.stats.stars,
      downloads: props.stats.downloads,
      installs: props.stats.installs,
      starVelocity7d: props.starVelocity7d,
      starVelocity30d: props.starVelocity30d,
      ownerAccountId: props.ownerAccountId ?? null,
      deprecated: props.deprecated,
      publishedAt: props.publishedAt,
      updatedAt: props.updatedAt,
      indexedAt: props.indexedAt,
    }

    const haystack = [props.displayName, props.summary, ...props.keywords]
      .join(' ')
      .toLowerCase()

    const statements: BatchStatement[] = [
      this.db
        .insert(artifacts)
        .values(values)
        .onConflictDoUpdate({ target: artifacts.id, set: values }),
      this.db.delete(artifactCategories).where(eq(artifactCategories.artifactId, values.id)),
      this.db
        .insert(artifactSearch)
        .values({ artifactId: values.id, haystack })
        .onConflictDoUpdate({ target: artifactSearch.artifactId, set: { haystack } }),
    ]

    if (props.categories.length > 0) {
      statements.push(
        this.db.insert(artifactCategories).values(
          props.categories.map((categoryId) => ({
            artifactId: values.id,
            categoryId: String(categoryId),
          })),
        ),
      )
    }

    return statements
  }
}

function orderFor(query: ArtifactQuery) {
  switch (query.sort) {
    case 'name':
      return [asc(artifacts.displayName)]
    case 'recent':
      return [desc(artifacts.updatedAt)]
    case 'rising':
      // Star velocity first, then the popularity weighting, so a fast-climbing
      // new plugin outranks a stagnant incumbent.
      return [desc(artifacts.starVelocity7d), desc(popularityExpression())]
    case 'relevance':
      // Ranked by how early the query lands, then by the same weighting
      // `Artifact.popularity` uses, so a text search still surfaces the
      // artifact people actually install rather than the shortest name.
      return [
        desc(sql`(${artifacts.ownerAccountId} is not null)`),
        desc(popularityExpression()),
      ]
    case 'popular':
    default:
      return [desc(popularityExpression()), desc(artifacts.updatedAt)]
  }
}

function popularityExpression() {
  return sql`(${artifacts.installs} * 3 + ${artifacts.stars} + ${artifacts.downloads} / 10.0) * (case when ${artifacts.ownerAccountId} is not null then 1.25 else 1 end)`
}

function toEntity(row: ArtifactRow): Artifact {
  const props: ArtifactProps = {
    id: slug(row.id),
    kind: artifactKind(row.kind),
    displayName: row.displayName,
    summary: row.summary,
    source: row.source as SourceRef,
    ...(row.sourceCommitSha === null ? {} : { sourceCommitSha: row.sourceCommitSha }),
    payload: row.payload as ArtifactPayload,
    keywords: (row.keywords as string[]) ?? [],
    categories: ((row.categories as string[]) ?? []).map((value) => slug(value)),
    ...(row.license === null ? {} : { license: row.license }),
    ...(row.authorName === null
      ? {}
      : { author: { name: row.authorName, ...(row.authorUrl === null ? {} : { url: row.authorUrl }) } }),
    ...(row.readmeMarkdown === null ? {} : { readmeMarkdown: row.readmeMarkdown }),
    ...(row.ogImageUrl === null ? {} : { ogImageUrl: row.ogImageUrl }),
    stats: { stars: row.stars, downloads: row.downloads, installs: row.installs },
    starVelocity7d: row.starVelocity7d,
    starVelocity30d: row.starVelocity30d,
    ...(row.ownerAccountId === null ? {} : { ownerAccountId: row.ownerAccountId }),
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    indexedAt: row.indexedAt,
    deprecated: row.deprecated,
  }
  return Artifact.rehydrate(props)
}
