import { describe, expect, it } from 'vitest'
import { DomainError } from '../../domain/shared/error.js'
import { ASK_LIMITS, KvAskRateLimiter, MemoryKv } from './kv-ask-rate-limiter.js'

function limiter(now: { value: number }, maxPerIp?: number) {
  const kv = new MemoryKv(() => now.value)
  return {
    kv,
    limiter: new KvAskRateLimiter(kv, {
      now: () => now.value,
      ...(maxPerIp === undefined ? {} : { maxPerIp }),
    }),
  }
}

describe('KvAskRateLimiter', () => {
  it('allows the documented IP budget and rejects the next ask', async () => {
    const now = { value: 1_000_000 }
    const { limiter: ask } = limiter(now)
    for (let i = 0; i < ASK_LIMITS.ipAsks; i += 1) {
      const lease = await ask.consume({ ip: '1.1.1.1', artifactId: 'dsh-a' })
      await lease.release()
    }
    await expect(ask.consume({ ip: '1.1.1.1', artifactId: 'dsh-a' })).rejects.toSatisfy(
      (error: unknown) => error instanceof DomainError && error.code === 'RATE_LIMITED',
    )
  })

  it('caps concurrent streams per IP', async () => {
    const now = { value: 1_000_000 }
    const { limiter: ask } = limiter(now)
    const leases = []
    for (let i = 0; i < ASK_LIMITS.concurrentPerIp; i += 1) {
      leases.push(await ask.consume({ ip: '2.2.2.2', artifactId: `dsh-${i}` }))
    }
    await expect(ask.consume({ ip: '2.2.2.2', artifactId: 'dsh-x' })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    })
    await leases[0]!.release()
    await expect(ask.consume({ ip: '2.2.2.2', artifactId: 'dsh-y' })).resolves.toBeDefined()
  })

  it('trips the Ada circuit and then answers UNAVAILABLE', async () => {
    const now = { value: 1_000_000 }
    const { limiter: ask } = limiter(now)
    await ask.tripCircuit(300)
    await expect(ask.consume({ ip: '3.3.3.3', artifactId: 'dsh-a' })).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof DomainError &&
        error.code === 'UNAVAILABLE' &&
        error.details.retryAfter === 300,
    )
  })
})
