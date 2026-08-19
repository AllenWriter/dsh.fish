import { and, asc, gt, isNotNull, sql } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { ReadmeLocalizationBackfillSource } from '../../application/port/readme-localization.js'
import type { Slug } from '../../domain/shared/slug.js'
import { slug } from '../../domain/shared/slug.js'
import { artifacts } from './catalog-schema.js'
import * as schema from './schema.js'

type Db = DrizzleD1Database<typeof schema>

/** Lightweight D1 projection; it never hydrates full Artifact aggregates. */
export class D1ReadmeLocalizationBackfillSource implements ReadmeLocalizationBackfillSource {
  constructor(private readonly db: Db) {}

  async listAfter(afterArtifactId: Slug | undefined, limit: number) {
    const rows = await this.db
      .select({ artifactId: artifacts.id, markdown: artifacts.readmeMarkdown })
      .from(artifacts)
      .where(
        and(
          isNotNull(artifacts.readmeMarkdown),
          sql`trim(${artifacts.readmeMarkdown}) <> ''`,
          ...(afterArtifactId === undefined ? [] : [gt(artifacts.id, afterArtifactId)]),
        ),
      )
      .orderBy(asc(artifacts.id))
      .limit(limit)

    return rows.map((row) => {
      if (row.markdown === null) {
        throw new Error('README backfill projection returned a null README.')
      }
      return { artifactId: slug(row.artifactId), markdown: row.markdown }
    })
  }
}
