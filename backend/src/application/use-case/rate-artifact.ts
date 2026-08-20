import type { Actor } from '../../domain/account/account.js'
import { requireActor } from '../../domain/account/account.js'
import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { Review } from '../../domain/review/review.js'
import type { ReviewRepository } from '../../domain/review/review.js'
import { DomainError } from '../../domain/shared/error.js'
import { slug } from '../../domain/shared/slug.js'
import type { ArtifactReviewsDto } from '../dto/review-dto.js'
import { toArtifactReviewsDto } from '../dto/review-dto.js'

export interface RateArtifactInput {
  readonly artifactId: string
  readonly rating: number
  readonly comment?: string
}

/** How many reviews the write path returns with the fresh aggregate. */
const RECENT_AFTER_WRITE = 5

/**
 * Rate an artifact, replacing the caller's earlier rating if there is one.
 *
 * Unlike catalog submissions this accepts a device-token actor on purpose: a
 * harness agent rating something it just installed is the primary source of
 * reviews, and a rating only ever speaks for the account that holds the token.
 * The response is the same read model the website renders, so the caller sees
 * its own rating land in the aggregate.
 */
export class RateArtifact {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly artifacts: ArtifactRepository,
  ) {}

  async execute(actor: Actor | undefined, input: RateArtifactInput): Promise<ArtifactReviewsDto> {
    const session = requireActor(actor)
    const artifact = await this.artifacts.findById(slug(input.artifactId))
    if (!artifact) {
      throw DomainError.notFound('No such artifact.', { artifactId: input.artifactId })
    }

    const review = Review.rate({
      artifactId: artifact.id,
      accountId: session.account.id,
      authorName: session.account.displayName,
      ...(session.account.avatarUrl === undefined
        ? {}
        : { authorAvatarUrl: session.account.avatarUrl }),
      rating: input.rating,
      ...(input.comment === undefined ? {} : { comment: input.comment }),
    })
    await this.reviews.save(review)

    const [summary, items] = await Promise.all([
      this.reviews.summarize(artifact.id),
      this.reviews.listByArtifact(artifact.id, RECENT_AFTER_WRITE),
    ])
    return toArtifactReviewsDto(artifact.id, summary, items)
  }
}
