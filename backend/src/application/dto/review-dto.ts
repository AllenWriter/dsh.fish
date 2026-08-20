import { RATING_MAX, RATING_MIN } from '../../domain/review/review.js'
import type { RatingDistribution, Review, ReviewSummary } from '../../domain/review/review.js'

export interface ReviewAuthorDto {
  readonly name: string
  readonly avatarUrl?: string
}

export interface ReviewDto {
  readonly author: ReviewAuthorDto
  readonly rating: number
  readonly comment?: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface ReviewSummaryDto {
  /** One-decimal mean; null while nobody has rated, so JSON keeps the field. */
  readonly average: number | null
  readonly count: number
  readonly distribution: RatingDistribution
}

/**
 * Everything a client — the website, the CLI, or the hub plugin — needs to
 * render community sentiment: the rating scale itself, the aggregate, and the
 * most recent reviews. The scale travels with the payload so an agent never
 * has to guess what a rating means on this site.
 */
export interface ArtifactReviewsDto {
  readonly artifactId: string
  readonly scale: { readonly min: number; readonly max: number }
  readonly summary: ReviewSummaryDto
  readonly items: readonly ReviewDto[]
}

export function toReviewDto(review: Review): ReviewDto {
  return {
    author: {
      name: review.authorName,
      ...(review.authorAvatarUrl === undefined ? {} : { avatarUrl: review.authorAvatarUrl }),
    },
    rating: review.rating,
    ...(review.comment === undefined ? {} : { comment: review.comment }),
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  }
}

export function toArtifactReviewsDto(
  artifactId: string,
  summary: ReviewSummary,
  items: readonly Review[],
): ArtifactReviewsDto {
  return {
    artifactId,
    scale: { min: RATING_MIN, max: RATING_MAX },
    summary: {
      average: summary.average ?? null,
      count: summary.count,
      distribution: summary.distribution,
    },
    items: items.map(toReviewDto),
  }
}
