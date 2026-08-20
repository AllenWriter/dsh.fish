import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { Artifact } from '../../../domain/artifact/artifact.js'
import type { ArtifactRepository } from '../../../domain/artifact/artifact-repository.js'
import { githubSource, npmSource } from '../../../domain/artifact/source-ref.js'
import { AskArtifact } from '../../../application/use-case/ask-artifact.js'
import type { ArtifactAskPort, AskEvent } from '../../../application/port/artifact-ask.js'
import { KvAskRateLimiter, MemoryKv } from '../../../infrastructure/ask/kv-ask-rate-limiter.js'
import type { Container } from '../../../infrastructure/container.js'
import type { HubBindings } from '../app.js'
import { toApiError } from '../error-mapper.js'
import { isDomainError } from '../../../domain/shared/error.js'
import { askRoutes } from './ask-routes.js'

const github = Artifact.create({
  id: 'dsh-postgres-mcp',
  kind: 'mcp-server',
  displayName: 'Postgres MCP',
  summary: 'Query postgres.',
  source: githubSource({ owner: 'acme', repo: 'postgres-mcp' }),
  payload: { kind: 'mcp-server', serverName: 'postgres', transport: 'stdio', command: 'npx', credentials: [] },
})

const npm = Artifact.create({
  id: 'dsh-turtle-ui',
  kind: 'bundle',
  displayName: 'turtle-ui',
  summary: 'A TUI.',
  source: npmSource('@turtle/dsh-turtle-ui', '0.4.2'),
  payload: { kind: 'bundle', requiresBuild: false },
})

function repo(row: Artifact): ArtifactRepository {
  return { findById: async (id: string) => (id === row.id ? row : undefined) } as unknown as ArtifactRepository
}

function ada(events: AskEvent[], queryId = 'ask_uuid'): ArtifactAskPort {
  return {
    start: async (input) => ({
      queryId: input.queryId ?? queryId,
      events: (async function* () {
        yield* events
      })(),
    }),
  }
}

function app(options: {
  artifact: Artifact
  events?: AskEvent[]
  enabled?: boolean
  maxPerIp?: number
  port?: ArtifactAskPort
}) {
  const kv = new MemoryKv()
  const useCase = new AskArtifact(
    repo(options.artifact),
    options.port ?? ada(options.events ?? [{ type: 'delta', text: 'Hi' }, { type: 'done' }]),
    new KvAskRateLimiter(kv, { maxPerIp: options.maxPerIp ?? 12 }),
    options.enabled ?? true,
  )
  const hono = new Hono<HubBindings>()
  hono.onError((error, context) => {
    const { status, body } = toApiError(error)
    if (isDomainError(error) && typeof error.details.retryAfter === 'number') {
      context.header('Retry-After', String(error.details.retryAfter))
    }
    return context.json(body, status)
  })
  hono.use('*', async (context, next) => {
    context.set('container', { useCases: { askArtifact: useCase } } as unknown as Container)
    await next()
  })
  hono.route('/api/v1', askRoutes())
  return hono
}

describe('POST /api/v1/artifacts/:id/ask', () => {
  it('streams SSE for a GitHub artifact', async () => {
    const response = await app({
      artifact: github,
      events: [
        { type: 'file', repo: 'acme/postgres-mcp', path: 'src/index.ts' },
        { type: 'delta', text: 'It queries Postgres.' },
        { type: 'done' },
      ],
    }).request('/api/v1/artifacts/dsh-postgres-mcp/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '8.8.8.8' },
      body: JSON.stringify({ question: 'What is this?' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Ask-Query-Id')).toBe('ask_uuid')
    const body = await response.text()
    expect(body).toContain('event: file')
    expect(body).toContain('event: delta')
    expect(body).toContain('event: done')
    expect(body).toContain('src/index.ts')
  })

  it('rejects an npm artifact with 422', async () => {
    const response = await app({ artifact: npm }).request('/api/v1/artifacts/dsh-turtle-ui/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: 'What is this?' }),
    })
    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'UNSUPPORTED' } })
  })

  it('returns 429 when the IP budget is exhausted', async () => {
    const hono = app({ artifact: github, maxPerIp: 1 })
    const headers = { 'content-type': 'application/json', 'cf-connecting-ip': '9.9.9.9' }
    await hono.request('/api/v1/artifacts/dsh-postgres-mcp/ask', {
      method: 'POST',
      headers,
      body: JSON.stringify({ question: 'First' }),
    })
    const limited = await hono.request('/api/v1/artifacts/dsh-postgres-mcp/ask', {
      method: 'POST',
      headers,
      body: JSON.stringify({ question: 'Second' }),
    })
    expect(limited.status).toBe(429)
    await expect(limited.json()).resolves.toMatchObject({ error: { code: 'RATE_LIMITED' } })
  })
})
