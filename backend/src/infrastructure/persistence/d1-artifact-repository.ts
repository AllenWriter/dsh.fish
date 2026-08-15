import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { Artifact } from '../../domain/artifact/artifact.js'
import type { ArtifactProps } from '../../domain/artifact/artifact.js'
import { artifactKind } from '../../domain/artifact/artifact-kind.js'
import type { ArtifactPayload } from '../../domain/artifact/artifact-payload.js'
import type {
  ArtifactQuery,
  ArtifactRepository,
  KindCount,
} from '../../domain/artifact/artifact-repository.js'
import type { SourceRef } from '../../domain/artifact/source-ref.js'
import type { Page } from '../../domain/shared/pagination.js'
import { page } from '../../domain/shared/pagination.js'
import type { Slug } from '../../domain/shared/slug.js'
import { slug } from '../../domain/shared/slug.js'
import { artifactCategories, artifacts, artifactSearch } from './catalog-schema.js'
import * as schema from './schema.js'

type Db = DrizzleD1Database<typeof schema>
type ArtifactRow = typeof artifacts.$inferSelect
/** One statement in a D1 batch. Drizzle types each builder differently, so the
 *  heterogeneous list needs the shared base type to stay assignable. */
type BatchStatement = BatchItem<'sqlite'>

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

  async listIdsByOrigin(origin: string): Promise<readonly Slug[]> {
    const rows = await this.db
      .select({ id: artifacts.id })
      .from(artifacts)
      .where(eq(artifacts.sourceOrigin, origin))
    return rows.map((row) => slug(row.id))
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
      payload: props.payload,
      keywords: props.keywords,
      categories: props.categories.map(String),
      license: props.license ?? null,
      authorName: props.author?.name ?? null,
      authorUrl: props.author?.url ?? null,
      readmeMarkdown: props.readmeMarkdown ?? null,
      stars: props.stats.stars,
      downloads: props.stats.downloads,
      installs: props.stats.installs,
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
    payload: row.payload as ArtifactPayload,
    keywords: (row.keywords as string[]) ?? [],
    categories: ((row.categories as string[]) ?? []).map((value) => slug(value)),
    ...(row.license === null ? {} : { license: row.license }),
    ...(row.authorName === null
      ? {}
      : { author: { name: row.authorName, ...(row.authorUrl === null ? {} : { url: row.authorUrl }) } }),
    ...(row.readmeMarkdown === null ? {} : { readmeMarkdown: row.readmeMarkdown }),
    stats: { stars: row.stars, downloads: row.downloads, installs: row.installs },
    ...(row.ownerAccountId === null ? {} : { ownerAccountId: row.ownerAccountId }),
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    indexedAt: row.indexedAt,
    deprecated: row.deprecated,
  }
  return Artifact.rehydrate(props)
}
