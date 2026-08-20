import { describe, expect, it } from 'vitest'
import type { Actor } from '../../domain/account/account.js'
import { Artifact } from '../../domain/artifact/artifact.js'
import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { npmSource } from '../../domain/artifact/source-ref.js'
import { Review } from '../../domain/review/review.js'
import type { ReviewRepository, ReviewSummary } from '../../domain/review/review.js'
import { DomainError } from '../../domain/shared/error.js'
import { GetArtifactReviews } from './get-artifact-reviews.js'
import { RateArtifact } from './rate-artifact.js'

const artifact = Artifact.create({
  id: 'dsh-postgres-mcp',
  kind: 'mcp-server',
  displayName: 'Postgres MCP',
  summary: 'Query Postgres from the harness.',
  source: npmSource('dsh-postgres-mcp', '1.0.0'),
  payload: {
    kind: 'mcp-server',
    serverName: 'postgres',
    transport: 'streamable-http',
    url: 'https://example.com/mcp',
    credentials: [],
  },
  updatedAt: new Date('2025-06-01T00:00:00.000Z'),
})

function actor(channel: Actor['channel']): Actor {
  return {
    account: { id: 'account-1', displayName: 'Ada', isAdmin: false },
    channel,
  }
}

function harness() {
  const saved: Review[] = []
  const reviews: ReviewRepository = {
    save: async (review) => {
      saved.push(review)
    },
    listByArtifact: async () => saved,
    summarize: async (): Promise<ReviewSummary> => {
      const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0]
      for (const review of saved) distribution[review.rating - 1] = (distribution[review.rating - 1] ?? 0) + 1
      const count = saved.length
      const sum = saved.reduce((total, review) => total + review.rating, 0)
      return {
        ...(count === 0 ? {} : { average: Math.round((sum / count) * 10) / 10 }),
        count,
        distribution,
      }
    },
  }
  const artifacts = {
    findById: async (id: string) => (id === artifact.id ? artifact : undefined),
  } as unknown as ArtifactRepository
  return { saved, reviews, artifacts }
}

describe('RateArtifact', () => {
  it('lets a device-token actor rate, since a harness agent is the primary reviewer', async () => {
    const { saved, reviews, artifacts } = harness()
    const result = await new RateArtifact(reviews, artifacts).execute(actor('device-token'), {
      artifactId: 'dsh-postgres-mcp',
      rating: 5,
      comment: 'Installed and queried a live database with it.',
    })

    expect(saved).toHaveLength(1)
    expect(saved[0]?.authorName).toBe('Ada')
    expect(result.summary.count).toBe(1)
    expect(result.summary.average).toBe(5)
    expect(result.summary.distribution).toEqual([0, 0, 0, 0, 1])
    expect(result.scale).toEqual({ min: 1, max: 5 })
    expect(result.items[0]?.comment).toBe('Installed and queried a live database with it.')
  })

  it('requires a signed-in actor', async () => {
    const { reviews, artifacts } = harness()
    await expect(
      new RateArtifact(reviews, artifacts).execute(undefined, {
        artifactId: 'dsh-postgres-mcp',
        rating: 4,
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' } satisfies Partial<DomainError>)
  })

  it('rejects an artifact the catalog does not have', async () => {
    const { reviews, artifacts } = harness()
    await expect(
      new RateArtifact(reviews, artifacts).execute(actor('session'), {
        artifactId: 'dsh-missing',
        rating: 4,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' } satisfies Partial<DomainError>)
  })

  it('validates the rating through the domain', async () => {
    const { reviews, artifacts } = harness()
    await expect(
      new RateArtifact(reviews, artifacts).execute(actor('session'), {
        artifactId: 'dsh-postgres-mcp',
        rating: 9,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' } satisfies Partial<DomainError>)
  })
})

describe('GetArtifactReviews', () => {
  it('reports an empty aggregate before anyone rates', async () => {
    const { reviews, artifacts } = harness()
    const result = await new GetArtifactReviews(reviews, artifacts).execute('dsh-postgres-mcp')

    expect(result.summary).toEqual({ average: null, count: 0, distribution: [0, 0, 0, 0, 0] })
    expect(result.items).toEqual([])
  })

  it('caps the page at the maximum', async () => {
    const { saved, reviews, artifacts } = harness()
    const seenLimits: number[] = []
    const capped: typeof reviews = {
      ...reviews,
      listByArtifact: async (_id, limit) => {
        seenLimits.push(limit)
        return saved
      },
    }
    await new GetArtifactReviews(capped, artifacts).execute('dsh-postgres-mcp', 500)
    expect(seenLimits).toEqual([100])
  })
})
