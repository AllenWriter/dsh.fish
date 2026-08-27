import { describe, expect, it } from 'vitest'
import { DomainError } from '../../domain/shared/error.js'
import type { ArtifactAskPort } from '../../application/port/artifact-ask.js'
import { AskArtifact } from '../../application/use-case/ask-artifact.js'
import { Artifact } from '../../domain/artifact/artifact.js'
import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { githubSource } from '../../domain/artifact/source-ref.js'
import { ASK_LIMITS, KvAskRateLimiter, MemoryKv } from './kv-ask-rate-limiter.js'

const artifact = Artifact.create({
  id: 'dsh-postgres-mcp',
  kind: 'bundle',
  displayName: 'Postgres',
  summary: 'SQL.',
  source: githubSource({ owner: 'acme', repo: 'postgres-mcp' }),
  payload: { kind: 'bundle', requiresBuild: false },
})

const artifacts = {
  findById: async (id: string) => (id === artifact.id ? artifact : undefined),
} as unknown as ArtifactRepository

function hangingPort(): ArtifactAskPort & { release: () => void } {
  let resolveWait: () => void = () => {}
  const wait = new Promise<void>((resolve) => {
    resolveWait = resolve
  })
  return {
    release: () => resolveWait(),
    start: async () => ({
      queryId: 'load_uuid',
      events: (async function* () {
        await wait
        yield { type: 'done' as const }
      })(),
    }),
  }
}

function immediatePort(): ArtifactAskPort {
  return {
    start: async () => ({
      queryId: 'ok',
      events: (async function* () {
        yield { type: 'done' as const }
      })(),
    }),
  }
}

describe('ask limiter load (CI, fake Ada)', () => {
  it('429s after the concurrent IP budget on a ramp of 20', async () => {
    const kv = new MemoryKv()
    const limiter = new KvAskRateLimiter(kv)
    const ada = hangingPort()
    const useCase = new AskArtifact(artifacts, ada, limiter, true)

    const attempts = Array.from({ length: 20 }, (_, index) =>
      useCase
        .execute({ artifactId: artifact.id, question: `Q${index}`, ip: '10.0.0.1' })
        .then(async (session) => {
          const events = session.events[Symbol.asyncIterator]()
          return { ok: true as const, events }
        })
        .catch((error: unknown) => ({ ok: false as const, error })),
    )

    const settled = await Promise.all(attempts)
    const ok = settled.filter((row) => row.ok)
    const limited = settled.filter((row) => !row.ok)
    expect(ok).toHaveLength(ASK_LIMITS.concurrentPerIp)
    expect(limited.length).toBe(20 - ASK_LIMITS.concurrentPerIp)
    expect(
      limited.every(
        (row) => !row.ok && row.error instanceof DomainError && row.error.code === 'RATE_LIMITED',
      ),
    ).toBe(true)
    const limitedError = limited.find((row) => !row.ok)?.error
    expect(limitedError).toBeInstanceOf(DomainError)
    if (limitedError instanceof DomainError) {
      expect(limitedError.details.retryAfter).toBeTypeOf('number')
    }
    ada.release()
    for (const row of ok) {
      if (!row.ok) continue
      while (true) {
        const step = await row.events.next()
        if (step.done) break
      }
    }
  })

  it('enforces the per-artifact hourly cap across many ids on one IP', async () => {
    const kv = new MemoryKv()
    const limiter = new KvAskRateLimiter(kv, { maxPerIp: 10_000 })
    const useCase = new AskArtifact(artifacts, immediatePort(), limiter, true)
    for (let i = 0; i < ASK_LIMITS.artifactAsks; i += 1) {
      const session = await useCase.execute({
        artifactId: artifact.id,
        question: `Q${i}`,
        ip: '10.0.0.2',
      })
      for await (const _event of session.events) {
        /* drain */
      }
    }
    await expect(
      useCase.execute({ artifactId: artifact.id, question: 'one more', ip: '10.0.0.2' }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })

  it('opens the Ada circuit after a 429 and then 503s', async () => {
    let calls = 0
    const port: ArtifactAskPort = {
      start: async () => {
        calls += 1
        if (calls === 1) {
          throw DomainError.unavailable('The Q&A service is temporarily unavailable.', {
            rateLimited: true,
            retryAfter: 300,
          })
        }
        return {
          queryId: 'late',
          events: (async function* () {
            yield { type: 'done' as const }
          })(),
        }
      },
    }
    const limiter = new KvAskRateLimiter(new MemoryKv())
    const useCase = new AskArtifact(artifacts, port, limiter, true)
    await expect(
      useCase.execute({ artifactId: artifact.id, question: 'first', ip: '10.0.0.3' }),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    await expect(
      useCase.execute({ artifactId: artifact.id, question: 'second', ip: '10.0.0.3' }),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect(calls).toBe(1)
  })
})
