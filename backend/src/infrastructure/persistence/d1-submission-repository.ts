import { and, desc, eq } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { artifactKind } from '../../domain/artifact/artifact-kind.js'
import type { SourceRef } from '../../domain/artifact/source-ref.js'
import { Submission } from '../../domain/submission/submission.js'
import type { SubmissionProps, SubmissionRepository, SubmissionStatus } from '../../domain/submission/submission.js'
import { submissions } from './catalog-schema.js'
import * as schema from './schema.js'

type Db = DrizzleD1Database<typeof schema>

/** Stable identity for a source, so two spellings of the same repo collide. */
export function sourceKey(source: SourceRef): string {
  switch (source.origin) {
    case 'npm':
      return `npm:${source.packageName.toLowerCase()}`
    case 'github':
      return `github:${source.owner.toLowerCase()}/${source.repo.toLowerCase()}${
        source.path === undefined ? '' : `/${source.path.toLowerCase()}`
      }`
    case 'submission':
      return `url:${source.homepageUrl.toLowerCase()}`
  }
}

export class D1SubmissionRepository implements SubmissionRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<Submission | undefined> {
    const rows = await this.db.select().from(submissions).where(eq(submissions.id, id)).limit(1)
    const row = rows[0]
    return row ? toEntity(row) : undefined
  }

  async listByAccount(accountId: string): Promise<readonly Submission[]> {
    const rows = await this.db
      .select()
      .from(submissions)
      .where(eq(submissions.accountId, accountId))
      .orderBy(desc(submissions.createdAt))
      .limit(100)
    return rows.map(toEntity)
  }

  async listPending(limit: number): Promise<readonly Submission[]> {
    const rows = await this.db
      .select()
      .from(submissions)
      .where(eq(submissions.status, 'pending'))
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
    return rows.map(toEntity)
  }

  async findPendingBySource(source: SourceRef): Promise<Submission | undefined> {
    const rows = await this.db
      .select()
      .from(submissions)
      .where(and(eq(submissions.sourceKey, sourceKey(source)), eq(submissions.status, 'pending')))
      .limit(1)
    const row = rows[0]
    return row ? toEntity(row) : undefined
  }

  async save(submission: Submission): Promise<void> {
    const props = submission.toProps()
    const values = {
      id: props.id,
      accountId: props.accountId,
      kind: props.kind,
      source: props.source,
      sourceKey: sourceKey(props.source),
      note: props.note ?? null,
      status: props.status,
      reviewerNote: props.reviewerNote ?? null,
      artifactId: props.artifactId ?? null,
      createdAt: props.createdAt,
      decidedAt: props.decidedAt ?? null,
    }
    await this.db
      .insert(submissions)
      .values(values)
      .onConflictDoUpdate({ target: submissions.id, set: values })
  }
}

function toEntity(row: typeof submissions.$inferSelect): Submission {
  const props: SubmissionProps = {
    id: row.id,
    accountId: row.accountId,
    kind: artifactKind(row.kind),
    source: row.source as SourceRef,
    ...(row.note === null ? {} : { note: row.note }),
    status: row.status as SubmissionStatus,
    ...(row.reviewerNote === null ? {} : { reviewerNote: row.reviewerNote }),
    ...(row.artifactId === null ? {} : { artifactId: row.artifactId }),
    createdAt: row.createdAt,
    ...(row.decidedAt === null ? {} : { decidedAt: row.decidedAt }),
  }
  return Submission.rehydrate(props)
}
