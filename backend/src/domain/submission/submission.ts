import { DomainError } from '../shared/error.js'
import type { ArtifactKind } from '../artifact/artifact-kind.js'
import type { SourceRef } from '../artifact/source-ref.js'

export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface SubmissionProps {
  readonly id: string
  readonly accountId: string
  readonly kind: ArtifactKind
  readonly source: SourceRef
  readonly note?: string
  readonly status: SubmissionStatus
  readonly reviewerNote?: string
  /** Set once the submission has produced a catalog row. */
  readonly artifactId?: string
  readonly createdAt: Date
  readonly decidedAt?: Date
}

/**
 * A user's request to add a source to the catalog.
 *
 * A submission is deliberately not an `Artifact`: it records *intent* plus who
 * is accountable for it. Indexing runs the same manifest parsing a crawl does,
 * so an approved submission produces exactly the row a crawl would have — a
 * submitter cannot hand-write catalog fields the crawler would not accept.
 */
export class Submission {
  private constructor(private readonly props: SubmissionProps) {}

  static open(input: {
    id: string
    accountId: string
    kind: ArtifactKind
    source: SourceRef
    note?: string
  }): Submission {
    if (input.accountId.trim() === '') {
      throw DomainError.unauthenticated('A submission needs an account.')
    }
    if (input.note !== undefined && input.note.length > 1000) {
      throw DomainError.invalid('A submission note may not exceed 1000 characters.')
    }
    if (input.source.origin === 'submission') {
      throw DomainError.invalid(
        'A submission must point at an npm package or a GitHub repository the registry can index.',
      )
    }
    return new Submission({
      id: input.id,
      accountId: input.accountId,
      kind: input.kind,
      source: input.source,
      ...(input.note === undefined ? {} : { note: input.note }),
      status: 'pending',
      createdAt: new Date(),
    })
  }

  static rehydrate(props: SubmissionProps): Submission {
    return new Submission(props)
  }

  get id(): string {
    return this.props.id
  }
  get accountId(): string {
    return this.props.accountId
  }
  get kind(): ArtifactKind {
    return this.props.kind
  }
  get source(): SourceRef {
    return this.props.source
  }
  get status(): SubmissionStatus {
    return this.props.status
  }
  get artifactId(): string | undefined {
    return this.props.artifactId
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get note(): string | undefined {
    return this.props.note
  }
  get reviewerNote(): string | undefined {
    return this.props.reviewerNote
  }
  get decidedAt(): Date | undefined {
    return this.props.decidedAt
  }

  approve(artifactId: string): Submission {
    this.assertPending()
    return new Submission({
      ...this.props,
      status: 'approved',
      artifactId,
      decidedAt: new Date(),
    })
  }

  reject(reviewerNote: string): Submission {
    this.assertPending()
    if (reviewerNote.trim() === '') {
      throw DomainError.invalid('A rejection must state a reason.')
    }
    return new Submission({
      ...this.props,
      status: 'rejected',
      reviewerNote: reviewerNote.trim(),
      decidedAt: new Date(),
    })
  }

  private assertPending(): void {
    if (this.props.status !== 'pending') {
      throw DomainError.conflict('This submission has already been decided.', {
        submissionId: this.props.id,
        status: this.props.status,
      })
    }
  }

  toProps(): SubmissionProps {
    return this.props
  }
}

export interface SubmissionRepository {
  findById(id: string): Promise<Submission | undefined>
  listByAccount(accountId: string): Promise<readonly Submission[]>
  listPending(limit: number): Promise<readonly Submission[]>
  findPendingBySource(source: SourceRef): Promise<Submission | undefined>
  save(submission: Submission): Promise<void>
}
