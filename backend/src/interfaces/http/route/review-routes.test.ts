import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import type { Actor } from '../../../domain/account/account.js'
import { Artifact } from '../../../domain/artifact/artifact.js'
import type { ArtifactRepository } from '../../../domain/artifact/artifact-repository.js'
import { npmSource } from '../../../domain/artifact/source-ref.js'
import { Review } from '../../../domain/review/review.js'
import type { ReviewRepository, ReviewSummary } from '../../../domain/review/review.js'
import { GetArtifactReviews } from '../../../application/use-case/get-artifact-reviews.js'
import { RateArtifact } from '../../../application/use-case/rate-artifact.js'
import type { ArtifactReviewsDto } from '../../../application/dto/review-dto.js'
import type { Container } from '../../../infrastructure/container.js'
import type { HubBindings } from '../app.js'
import { toApiError } from '../error-mapper.js'
import { reviewRoutes } from './review-routes.js'

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

const deviceActor: Actor = {
  account: { id: 'account-1', displayName: 'Ada', isAdmin: false },
  channel: 'device-token',
}

function testContainer() {
  const saved: Review[] = []
  const reviews: ReviewRepository = {
    save: async (review) => {
      const stale = saved.findIndex(
        (entry) => entry.artifactId === review.artifactId && entry.accountId === review.accountId,
      )
      if (stale >= 0) saved.splice(stale, 1)
      saved.push(review)
    },
    listByArtifact: async () => saved,
    summarize: async (): Promise<ReviewSummary> => {
      const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0]
      for (const review of saved) distribution[review.rating - 1] = (distribution[review.rating - 1] ?? 0) + 1
      const sum = saved.reduce((total, review) => total + review.rating, 0)
      return {
        ...(saved.length === 0 ? {} : { average: Math.round((sum / saved.length) * 10) / 10 }),
        count: saved.length,
        distribution,
      }
    },
  }
  const artifacts = {
    findById: async (id: string) => (id === artifact.id ? artifact : undefined),
  } as unknown as ArtifactRepository
  return {
    useCases: {
      getArtifactReviews: new GetArtifactReviews(reviews, artifacts),
      rateArtifact: new RateArtifact(reviews, artifacts),
    },
  } as unknown as Container
}

function testApp(actor: Actor | undefined) {
  // One container per app, not per request: the stateful fake has to observe
  // the write when a later read request arrives.
  const container = testContainer()
  const app = new Hono<HubBindings>()
  app.use('*', async (context, next) => {
    context.set('container', container)
    context.set('actor', actor)
    await next()
  })
  app.onError((error, context) => {
    const { status, body } = toApiError(error)
    return context.json(body, status)
  })
  app.route('/api/v1', reviewRoutes())
  return app
}

describe('review endpoints', () => {
  it('serves an anonymous read with the rating scale attached', async () => {
    const response = await testApp(undefined).request('/api/v1/artifacts/dsh-postgres-mcp/reviews')

    expect(response.status).toBe(200)
    const body = (await response.json()) as ArtifactReviewsDto
    expect(body.scale).toEqual({ min: 1, max: 5 })
    expect(body.summary).toEqual({ average: null, count: 0, distribution: [0, 0, 0, 0, 0] })
  })

  it('accepts a rating over a device token and returns the fresh aggregate', async () => {
    const app = testApp(deviceActor)
    const response = await app.request('/api/v1/artifacts/dsh-postgres-mcp/reviews/mine', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rating: 5, comment: 'Solid.' }),
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as ArtifactReviewsDto
    expect(body.summary.count).toBe(1)
    expect(body.items[0]?.author.name).toBe('Ada')

    const listed = await app.request('/api/v1/artifacts/dsh-postgres-mcp/reviews')
    const listedBody = (await listed.json()) as ArtifactReviewsDto
    expect(listedBody.summary.average).toBe(5)
  })

  it('rejects a write from an anonymous caller', async () => {
    const response = await testApp(undefined).request(
      '/api/v1/artifacts/dsh-postgres-mcp/reviews/mine',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rating: 4 }),
      },
    )
    expect(response.status).toBe(401)
  })

  it('rejects an out-of-range rating before the domain runs', async () => {
    const response = await testApp(deviceActor).request(
      '/api/v1/artifacts/dsh-postgres-mcp/reviews/mine',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rating: 0 }),
      },
    )
    expect(response.status).toBe(400)
  })

  it('answers 404 for an artifact the catalog does not have', async () => {
    const response = await testApp(undefined).request('/api/v1/artifacts/dsh-missing/reviews')
    expect(response.status).toBe(404)
  })
})
