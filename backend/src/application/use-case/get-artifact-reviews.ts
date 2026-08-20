import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import type { ReviewRepository } from '../../domain/review/review.js'
import { DomainError } from '../../domain/shared/error.js'
import { slug } from '../../domain/shared/slug.js'
import type { ArtifactReviewsDto } from '../dto/review-dto.js'
import { toArtifactReviewsDto } from '../dto/review-dto.js'

/** Default page of recent reviews; the API caps it at REVIEW_PAGE_MAX. */
export const REVIEW_PAGE_DEFAULT = 20
export const REVIEW_PAGE_MAX = 100

/**
 * The public read side of community ratings. Anonymous by design, like the
 * rest of the catalog: the website server-renders it, and an agent can read
 * the site's rating scale, the distribution and individual comments before it
 * recommends or rates anything.
 */
export class GetArtifactReviews {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly artifacts: ArtifactRepository,
  ) {}

  async execute(artifactId: string, limit?: number): Promise<ArtifactReviewsDto> {
    const artifact = await this.artifacts.findById(slug(artifactId))
    if (!artifact) {
      throw DomainError.notFound('No such artifact.', { artifactId })
    }
    const page = Math.min(Math.max(limit ?? REVIEW_PAGE_DEFAULT, 1), REVIEW_PAGE_MAX)
    const [summary, items] = await Promise.all([
      this.reviews.summarize(artifact.id),
      this.reviews.listByArtifact(artifact.id, page),
    ])
    return toArtifactReviewsDto(artifact.id, summary, items)
  }
}
