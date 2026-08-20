import { describe, expect, it } from 'vitest'
import { Artifact } from '../../domain/artifact/artifact.js'
import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { githubSource, npmSource } from '../../domain/artifact/source-ref.js'
import { DomainError } from '../../domain/shared/error.js'
import type { ArtifactAskPort, AskEvent } from '../port/artifact-ask.js'
import type { AskLease, AskRateLimiter } from '../port/ask-rate-limiter.js'
import { ASK_QUESTION_MAX_CHARS, AskArtifact } from './ask-artifact.js'

const github = Artifact.create({
  id: 'dsh-postgres-mcp',
  kind: 'mcp-server',
  displayName: 'Postgres MCP',
  summary: 'Query postgres.',
  source: githubSource({ owner: 'acme', repo: 'postgres-mcp', commit: 'abc'.padEnd(40, '0') }),
  payload: {
    kind: 'mcp-server',
    serverName: 'postgres',
    transport: 'stdio',
    command: 'npx',
    credentials: [],
  },
})

const npm = Artifact.create({
  id: 'dsh-turtle-ui',
  kind: 'bundle',
  displayName: 'turtle-ui',
  summary: 'A TUI.',
  source: npmSource('@turtle/dsh-turtle-ui', '0.4.2'),
  payload: { kind: 'bundle', requiresBuild: false },
})

function artifacts(row = github): ArtifactRepository {
  return {
    findById: async (id: string) => (id === row.id ? row : undefined),
  } as unknown as ArtifactRepository
}

function limiter(onConsume?: () => void): AskRateLimiter & { released: boolean } {
  const handle = {
    released: false,
    consume: async () => {
      onConsume?.()
      return {
        release: async () => {
          handle.released = true
        },
      } satisfies AskLease
    },
    tripCircuit: async () => {},
  }
  return handle
}

function port(events: AskEvent[] = [{ type: 'done' }], queryId = 'q_1'): ArtifactAskPort {
  return {
    start: async (input) => ({
      queryId: input.queryId ?? queryId,
      events: (async function* () {
        yield* events
      })(),
    }),
  }
}

async function collect(events: AsyncIterable<AskEvent>): Promise<AskEvent[]> {
  const out: AskEvent[] = []
  for await (const event of events) out.push(event)
  return out
}

describe('AskArtifact', () => {
  it('rejects when the flag is off', async () => {
    const useCase = new AskArtifact(artifacts(), port(), limiter(), false)
    await expect(
      useCase.execute({ artifactId: github.id, question: 'What is this?', ip: '1.1.1.1' }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED' })
  })

  it('rejects an npm artifact', async () => {
    const useCase = new AskArtifact(artifacts(npm), port(), limiter(), true)
    await expect(
      useCase.execute({ artifactId: npm.id, question: 'What is this?', ip: '1.1.1.1' }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED', details: { reason: 'not_github' } })
  })

  it('rejects a missing artifact', async () => {
    const useCase = new AskArtifact(artifacts(), port(), limiter(), true)
    await expect(
      useCase.execute({ artifactId: 'nope', question: 'What is this?', ip: '1.1.1.1' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('rejects a question that is too long', async () => {
    const useCase = new AskArtifact(artifacts(), port(), limiter(), true)
    await expect(
      useCase.execute({
        artifactId: github.id,
        question: 'x'.repeat(ASK_QUESTION_MAX_CHARS + 1),
        ip: '1.1.1.1',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' })
  })

  it('streams Ada events for a GitHub artifact and releases the lease', async () => {
    const budget = limiter()
    const useCase = new AskArtifact(
      artifacts(),
      port([{ type: 'delta', text: 'Hi' }, { type: 'done' }]),
      budget,
      true,
    )
    const session = await useCase.execute({
      artifactId: github.id,
      question: 'What is this?',
      ip: '1.1.1.1',
    })
    expect(await collect(session.events)).toEqual([
      { type: 'delta', text: 'Hi' },
      { type: 'done' },
    ])
    expect(budget.released).toBe(true)
  })

  it('trips the circuit when Ada is rate-limited', async () => {
    let tripped = false
    const budget: AskRateLimiter & { released: boolean } = {
      released: false,
      consume: async () => ({
        release: async () => {
          budget.released = true
        },
      }),
      tripCircuit: async () => {
        tripped = true
      },
    }
    const ada: ArtifactAskPort = {
      start: async () => {
        throw DomainError.unavailable('The Q&A service is temporarily unavailable.', {
          rateLimited: true,
          retryAfter: 30,
        })
      },
    }
    const useCase = new AskArtifact(artifacts(), ada, budget, true)
    await expect(
      useCase.execute({ artifactId: github.id, question: 'What is this?', ip: '1.1.1.1' }),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect(tripped).toBe(true)
    expect(budget.released).toBe(true)
  })
})
