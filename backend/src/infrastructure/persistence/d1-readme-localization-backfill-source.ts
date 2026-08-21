import { and, asc, eq, exists, gt, lt, notExists, or, sql } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { ReadmeLocalizationBackfillSource } from '../../application/port/readme-localization.js'
import type { Slug } from '../../domain/shared/slug.js'
import { slug } from '../../domain/shared/slug.js'
import {
  artifactReadmeTranslations,
  artifactSummaryTranslations,
  artifacts,
} from './catalog-schema.js'
import * as schema from './schema.js'

type Db = DrizzleD1Database<typeof schema>

/** Lightweight D1 projection; it never hydrates full Artifact aggregates. */
export class D1ReadmeLocalizationBackfillSource implements ReadmeLocalizationBackfillSource {
  constructor(private readonly db: Db) {}

  async listAfter(afterArtifactId: Slug | undefined, limit: number) {
    const rows = await this.db
      .select({
        artifactId: artifacts.id,
        markdown: artifacts.readmeMarkdown,
        summary: artifacts.summary,
      })
      .from(artifacts)
      .where(
        and(
          eq(artifacts.deprecated, false),
          ...(afterArtifactId === undefined ? [] : [gt(artifacts.id, afterArtifactId)]),
        ),
      )
      .orderBy(asc(artifacts.id))
      .limit(limit)

    return rows.map(readmeRow)
  }

  async listStaleFailures(olderThan: Date, limit: number) {
    const failedReadme = this.db
      .select({ one: sql`1` })
      .from(artifactReadmeTranslations)
      .where(
        and(
          eq(artifactReadmeTranslations.artifactId, artifacts.id),
          eq(artifactReadmeTranslations.status, 'failed'),
          lt(artifactReadmeTranslations.updatedAt, olderThan),
        ),
      )
    const failedSummary = this.db
      .select({ one: sql`1` })
      .from(artifactSummaryTranslations)
      .where(
        and(
          eq(artifactSummaryTranslations.artifactId, artifacts.id),
          eq(artifactSummaryTranslations.status, 'failed'),
          lt(artifactSummaryTranslations.updatedAt, olderThan),
        ),
      )
    // Summaries joined the pipeline after the README stock backfill completed,
    // so an artifact with no summary row at all has never been scheduled for
    // one. Once any row exists, the 6-hour failure rule above owns the retry.
    const anySummary = this.db
      .select({ one: sql`1` })
      .from(artifactSummaryTranslations)
      .where(eq(artifactSummaryTranslations.artifactId, artifacts.id))

    const rows = await this.db
      .select({
        artifactId: artifacts.id,
        markdown: artifacts.readmeMarkdown,
        summary: artifacts.summary,
      })
      .from(artifacts)
      .where(
        and(
          eq(artifacts.deprecated, false),
          or(exists(failedReadme), exists(failedSummary), notExists(anySummary)),
        ),
      )
      .orderBy(asc(artifacts.id))
      .limit(limit)

    return rows.map(readmeRow)
  }
}

function readmeRow(row: { artifactId: string; markdown: string | null; summary: string }) {
  return {
    artifactId: slug(row.artifactId),
    ...(row.markdown === null || row.markdown.trim() === '' ? {} : { markdown: row.markdown }),
    summary: row.summary,
  }
}
