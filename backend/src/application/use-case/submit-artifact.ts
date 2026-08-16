import type { Actor } from '../../domain/account/account.js'
import { requireInteractiveSession } from '../../domain/account/account.js'
import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { artifactKind } from '../../domain/artifact/artifact-kind.js'
import { githubSource, npmSource } from '../../domain/artifact/source-ref.js'
import type { SourceRef } from '../../domain/artifact/source-ref.js'
import { Submission } from '../../domain/submission/submission.js'
import type { SubmissionRepository } from '../../domain/submission/submission.js'
import { DomainError } from '../../domain/shared/error.js'
import { slug } from '../../domain/shared/slug.js'
import type { IdGenerator, SourceIndexer } from '../port/source-indexer.js'
import { toArtifact } from './ingest-catalog.js'

export interface SubmitArtifactInput {
  readonly kind: string
  /** Either `npm:<package>` or `github:<owner>/<repo>[/<path>]`. */
  readonly sourceSpec: string
  readonly note?: string
}

export interface SubmitArtifactResult {
  readonly submissionId: string
  readonly status: 'approved' | 'pending'
  readonly artifactId?: string
}

/**
 * Submit a source for the catalog.
 *
 * A submission that the indexer can read and that the submitter demonstrably
 * owns is approved immediately — asking a maintainer to wait for review of
 * their own package would be friction with no safety benefit, since the row is
 * built by the same indexer a crawl uses. Everything else queues for review.
 */
export class SubmitArtifact {
  constructor(
    private readonly submissions: SubmissionRepository,
    private readonly artifacts: ArtifactRepository,
    private readonly indexers: readonly SourceIndexer[],
    private readonly ids: IdGenerator,
  ) {}

  async execute(actor: Actor | undefined, input: SubmitArtifactInput): Promise<SubmitArtifactResult> {
    const session = requireInteractiveSession(actor)
    const kind = artifactKind(input.kind)
    const source = parseSourceSpec(input.sourceSpec)

    const duplicate = await this.submissions.findPendingBySource(source)
    if (duplicate) {
      throw DomainError.alreadyExists('This source already has a pending submission.', {
        submissionId: duplicate.id,
      })
    }

    let submission = Submission.open({
      id: this.ids.next(),
      accountId: session.account.id,
      kind,
      source,
      ...(input.note === undefined ? {} : { note: input.note }),
    })

    const indexer = this.indexers.find((candidate) => candidate.origin === source.origin)
    if (!indexer) {
      throw DomainError.unsupported('No indexer can read this source.', {
        origin: source.origin,
      })
    }

    const snapshot = await indexer.indexOne({ kindHint: kind, source })
    if (!snapshot) {
      throw DomainError.invalid(
        'The registry could not read a harness manifest at that source. A bundle must declare `dsh.bundle` in its package.json.',
        { sourceSpec: input.sourceSpec },
      )
    }
    if (snapshot.kind !== kind) {
      throw DomainError.invalid('The source is not the kind it was submitted as.', {
        submitted: kind,
        detected: snapshot.kind,
      })
    }

    const existing = await this.artifacts.findById(slug(snapshot.id))
    if (existing && existing.ownerAccountId !== undefined && existing.ownerAccountId !== session.account.id) {
      throw DomainError.conflict('That artifact is already claimed by another account.', {
        artifactId: snapshot.id,
      })
    }

    if (ownsSource(session, source)) {
      const artifact = existing
        ? existing
            .refreshedWith({
              displayName: snapshot.displayName,
              summary: snapshot.summary,
              source: snapshot.source,
              payload: snapshot.payload,
              keywords: snapshot.keywords,
              categories: snapshot.categories,
              stats: { ...snapshot.stats, installs: existing.stats.installs },
            })
            .claimedBy(session.account.id)
        : toArtifact(snapshot, session.account.id)
      await this.artifacts.save(artifact)
      submission = submission.approve(artifact.id)
      await this.submissions.save(submission)
      return { submissionId: submission.id, status: 'approved', artifactId: artifact.id }
    }

    await this.submissions.save(submission)
    return { submissionId: submission.id, status: 'pending' }
  }
}

/**
 * Ownership proof for the auto-approve path.
 *
 * A GitHub source whose owner matches the signed-in account's linked GitHub
 * login is proof enough: Better Auth verified that identity through OAuth. An
 * npm package has no equivalent link, so it always goes to review.
 */
function ownsSource(session: Actor, source: SourceRef): boolean {
  if (source.origin !== 'github') return false
  const login = session.account.githubLogin
  if (login === undefined) return false
  return login.toLowerCase() === source.owner.toLowerCase()
}

export function parseSourceSpec(raw: string): SourceRef {
  const value = raw.trim()
  if (value.startsWith('npm:')) {
    return npmSource(value.slice('npm:'.length), '0.0.0')
  }
  if (value.startsWith('github:')) {
    const [ownerRepo, ...rest] = value.slice('github:'.length).split('/')
    const owner = ownerRepo ?? ''
    const repo = rest.shift() ?? ''
    const path = rest.join('/')
    return githubSource({ owner, repo, ...(path === '' ? {} : { path }) })
  }
  throw DomainError.invalid(
    'A source must be `npm:<package>` or `github:<owner>/<repo>[/<path>]`.',
    { raw },
  )
}
