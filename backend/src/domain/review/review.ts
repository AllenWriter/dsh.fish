import { DomainError } from '../shared/error.js'

export const RATING_MIN = 1
export const RATING_MAX = 5
export const REVIEW_COMMENT_MAX_LENGTH = 2000

/** Count per star value: index 0 is the 1-star count, index 4 the 5-star count. */
export type RatingDistribution = readonly [number, number, number, number, number]

export interface ReviewProps {
  readonly artifactId: string
  readonly accountId: string
  /**
   * The reviewer's display name, captured at rating time. A review is a public
   * statement that may outlive the account row (or a later rename), so the name
   * travels with the review instead of being joined back to Better Auth.
   */
  readonly authorName: string
  readonly authorAvatarUrl?: string
  readonly rating: number
  readonly comment?: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface ReviewSummary {
  /** One-decimal mean over every rating; undefined while nobody has rated. */
  readonly average?: number
  readonly count: number
  readonly distribution: RatingDistribution
}

/**
 * One account's judgement of one artifact: a 1–5 star rating plus an optional
 * comment. The (artifact, account) pair is the identity — rating again replaces
 * the earlier review rather than stacking a second one, so a user can correct
 * themselves but cannot ballot-stuff the average.
 */
export class Review {
  private constructor(private readonly props: ReviewProps) {}

  static rate(input: {
    artifactId: string
    accountId: string
    authorName: string
    authorAvatarUrl?: string
    rating: number
    comment?: string
  }): Review {
    if (input.artifactId.trim() === '') {
      throw DomainError.invalid('A review needs an artifact.')
    }
    if (input.accountId.trim() === '') {
      throw DomainError.unauthenticated('A review needs an account.')
    }
    if (input.authorName.trim() === '') {
      throw DomainError.invalid('A review needs the reviewer’s display name.')
    }
    if (
      !Number.isInteger(input.rating) ||
      input.rating < RATING_MIN ||
      input.rating > RATING_MAX
    ) {
      throw DomainError.invalid(`A rating must be a whole number from ${RATING_MIN} to ${RATING_MAX}.`, {
        rating: input.rating,
      })
    }
    const comment = input.comment?.trim()
    if (comment !== undefined && comment.length > REVIEW_COMMENT_MAX_LENGTH) {
      throw DomainError.invalid(
        `A review comment may not exceed ${REVIEW_COMMENT_MAX_LENGTH} characters.`,
      )
    }
    const now = new Date()
    return new Review({
      artifactId: input.artifactId,
      accountId: input.accountId,
      authorName: input.authorName.trim(),
      ...(input.authorAvatarUrl === undefined ? {} : { authorAvatarUrl: input.authorAvatarUrl }),
      rating: input.rating,
      ...(comment === undefined || comment === '' ? {} : { comment }),
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: ReviewProps): Review {
    return new Review(props)
  }

  get artifactId(): string {
    return this.props.artifactId
  }
  get accountId(): string {
    return this.props.accountId
  }
  get authorName(): string {
    return this.props.authorName
  }
  get authorAvatarUrl(): string | undefined {
    return this.props.authorAvatarUrl
  }
  get rating(): number {
    return this.props.rating
  }
  get comment(): string | undefined {
    return this.props.comment
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }

  toProps(): ReviewProps {
    return this.props
  }
}

export interface ReviewRepository {
  /** Insert, or replace the same account's earlier review of the artifact. */
  save(review: Review): Promise<void>
  /** Most recently written first. */
  listByArtifact(artifactId: string, limit: number): Promise<readonly Review[]>
  summarize(artifactId: string): Promise<ReviewSummary>
}
