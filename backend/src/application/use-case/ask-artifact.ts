import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { DomainError } from '../../domain/shared/error.js'
import { slug } from '../../domain/shared/slug.js'
import type { ArtifactAskPort, ArtifactAskSession } from '../port/artifact-ask.js'
import type { AskRateLimiter } from '../port/ask-rate-limiter.js'

export const ASK_QUESTION_MAX_CHARS = 2000

export interface AskArtifactInput {
  readonly artifactId: string
  readonly question: string
  readonly queryId?: string
  readonly ip: string
}

/**
 * Load a GitHub artifact, enforce the feature flag and budgets, then stream
 * Ada events. The Worker stays stateless besides the limiter's KV counters.
 */
export class AskArtifact {
  constructor(
    private readonly artifacts: ArtifactRepository,
    private readonly ask: ArtifactAskPort,
    private readonly limiter: AskRateLimiter,
    private readonly enabled: boolean,
  ) {}

  async execute(input: AskArtifactInput): Promise<ArtifactAskSession> {
    if (!this.enabled) {
      throw DomainError.unsupported('Ask is not enabled.', { reason: 'disabled' })
    }

    const artifact = await this.artifacts.findById(slug(input.artifactId))
    if (!artifact) {
      throw DomainError.notFound('No such artifact.', { artifactId: input.artifactId })
    }
    if (artifact.source.origin !== 'github') {
      throw DomainError.unsupported('Ask is only available for GitHub-sourced artifacts.', {
        reason: 'not_github',
      })
    }

    const question = input.question.trim()
    if (question.length === 0) {
      throw DomainError.invalid('A question is required.')
    }
    if (question.length > ASK_QUESTION_MAX_CHARS) {
      throw DomainError.invalid('Question is too long.', {
        max: ASK_QUESTION_MAX_CHARS,
        length: question.length,
      })
    }

    const lease = await this.limiter.consume({ ip: input.ip, artifactId: artifact.id })
    try {
      const session = await this.ask.start({
        repoName: `${artifact.source.owner}/${artifact.source.repo}`,
        question,
        ...(input.queryId === undefined ? {} : { queryId: input.queryId }),
        source: 'ada.dsh_fish',
      })
      return {
        queryId: session.queryId,
        events: releaseOnSettle(session.events, lease),
      }
    } catch (error) {
      await lease.release()
      if (isUpstreamRateLimit(error)) {
        const retryAfter =
          typeof error.details.retryAfter === 'number' ? error.details.retryAfter : undefined
        await this.limiter.tripCircuit(retryAfter)
      }
      throw error
    }
  }
}

function isUpstreamRateLimit(
  error: unknown,
): error is DomainError & { details: { retryAfter?: number } } {
  return error instanceof DomainError && error.code === 'UNAVAILABLE' && error.details.rateLimited === true
}

async function* releaseOnSettle<T>(
  events: AsyncIterable<T>,
  lease: { release(): Promise<void> },
): AsyncIterable<T> {
  try {
    yield* events
  } finally {
    await lease.release()
  }
}
