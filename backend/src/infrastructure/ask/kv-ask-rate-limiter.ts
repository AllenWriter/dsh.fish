import { DomainError } from '../../domain/shared/error.js'
import type { AskLease, AskRateLimiter } from '../../application/port/ask-rate-limiter.js'

/**
 * Starting budgets. Vars may override the per-IP cap; the rest stay constants
 * until a live Ada probe says otherwise.
 */
export const ASK_LIMITS = {
  ipAsks: 12,
  ipWindowMs: 10 * 60 * 1000,
  concurrentPerIp: 4,
  artifactAsks: 30,
  artifactWindowMs: 60 * 60 * 1000,
  workerAsks: 60,
  workerWindowMs: 60 * 1000,
  circuitMs: 5 * 60 * 1000,
} as const

export interface KvLike {
  get(key: string, type: 'text'): Promise<string | null>
  get(key: string, type: 'json'): Promise<unknown>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

export interface KvAskRateLimiterOptions {
  readonly maxPerIp?: number
  readonly now?: () => number
}

interface WindowState {
  readonly stamps: number[]
}

/**
 * KV read-modify-write is racy across isolates; within one Worker we serialize
 * consume/release so a burst on the same isolate cannot overshoot the caps.
 */
let kvAskChain: Promise<unknown> = Promise.resolve()

function serializedAsk<T>(fn: () => Promise<T>): Promise<T> {
  const run = kvAskChain.then(fn, fn)
  kvAskChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/**
 * Sliding-window limiter on the existing KV namespace. Concurrent streams are
 * a separate counter per IP; Ada 429 trips a Worker-wide circuit.
 */
export class KvAskRateLimiter implements AskRateLimiter {
  private readonly maxPerIp: number
  private readonly now: () => number

  constructor(
    private readonly kv: KvLike,
    options: KvAskRateLimiterOptions = {},
  ) {
    this.maxPerIp = options.maxPerIp ?? ASK_LIMITS.ipAsks
    this.now = options.now ?? Date.now
  }

  consume(input: { readonly ip: string; readonly artifactId: string }): Promise<AskLease> {
    return serializedAsk(() => this.consumeUnlocked(input))
  }

  private async consumeUnlocked(input: {
    readonly ip: string
    readonly artifactId: string
  }): Promise<AskLease> {
    const now = this.now()
    const circuitUntil = await this.readNumber('ask:circuit')
    if (circuitUntil !== undefined && circuitUntil > now) {
      throw DomainError.unavailable('The Q&A service is temporarily unavailable.', {
        retryAfter: Math.ceil((circuitUntil - now) / 1000),
      })
    }

    const ip = input.ip.trim() === '' ? 'unknown' : input.ip.trim()
    const inflightKey = `ask:inflight:${ip}`
    const inflight = (await this.readNumber(inflightKey)) ?? 0
    if (inflight >= ASK_LIMITS.concurrentPerIp) {
      throw DomainError.rateLimited('Too many questions in flight.', { retryAfter: 30 })
    }

    await this.hitWindow(`ask:ip:${ip}`, ASK_LIMITS.ipWindowMs, this.maxPerIp, now, 'Too many questions from this network.')
    await this.hitWindow(
      `ask:artifact:${input.artifactId}`,
      ASK_LIMITS.artifactWindowMs,
      ASK_LIMITS.artifactAsks,
      now,
      'Too many questions about this plugin.',
    )
    await this.hitWindow(
      'ask:worker',
      ASK_LIMITS.workerWindowMs,
      ASK_LIMITS.workerAsks,
      now,
      'Too many questions right now.',
    )

    await this.kv.put(inflightKey, String(inflight + 1), { expirationTtl: ttlSeconds(ASK_LIMITS.ipWindowMs) })
    let released = false
    return {
      release: () =>
        serializedAsk(async () => {
          if (released) return
          released = true
          const current = (await this.readNumber(inflightKey)) ?? 1
          await this.kv.put(inflightKey, String(Math.max(0, current - 1)), {
            expirationTtl: ttlSeconds(ASK_LIMITS.ipWindowMs),
          })
        }),
    }
  }

  async tripCircuit(retryAfterSeconds?: number): Promise<void> {
    const holdMs =
      retryAfterSeconds !== undefined && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : ASK_LIMITS.circuitMs
    const until = this.now() + holdMs
    await this.kv.put('ask:circuit', String(until), { expirationTtl: ttlSeconds(holdMs) })
  }

  private async hitWindow(
    key: string,
    windowMs: number,
    max: number,
    now: number,
    message: string,
  ): Promise<void> {
    const state = await this.readWindow(key)
    const stamps = state.stamps.filter((stamp) => now - stamp < windowMs)
    if (stamps.length >= max) {
      const oldest = stamps[0] ?? now
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000))
      throw DomainError.rateLimited(message, { retryAfter })
    }
    stamps.push(now)
    await this.kv.put(key, JSON.stringify({ stamps } satisfies WindowState), {
      expirationTtl: ttlSeconds(windowMs),
    })
  }

  private async readWindow(key: string): Promise<WindowState> {
    const value = await this.kv.get(key, 'json')
    if (typeof value !== 'object' || value === null || !('stamps' in value)) {
      return { stamps: [] }
    }
    const stamps = (value as WindowState).stamps
    if (!Array.isArray(stamps)) return { stamps: [] }
    return { stamps: stamps.filter((stamp) => typeof stamp === 'number') }
  }

  private async readNumber(key: string): Promise<number | undefined> {
    const raw = await this.kv.get(key, 'text')
    if (raw === null || raw === '') return undefined
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }
}

function ttlSeconds(windowMs: number): number {
  return Math.max(60, Math.ceil(windowMs / 1000) + 60)
}

/** In-memory KV for unit tests. Honours TTL against an injected clock. */
export class MemoryKv implements KvLike {
  private readonly store = new Map<string, { value: string; expiresAt?: number }>()

  constructor(private readonly now: () => number = Date.now) {}

  async get(key: string, type: 'text'): Promise<string | null>
  async get(key: string, type: 'json'): Promise<unknown>
  async get(key: string, type: 'text' | 'json'): Promise<string | null | unknown> {
    const entry = this.store.get(key)
    if (entry === undefined) return type === 'json' ? null : null
    if (entry.expiresAt !== undefined && entry.expiresAt <= this.now()) {
      this.store.delete(key)
      return null
    }
    if (type === 'json') {
      try {
        return JSON.parse(entry.value) as unknown
      } catch {
        return null
      }
    }
    return entry.value
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, {
      value,
      ...(options?.expirationTtl === undefined
        ? {}
        : { expiresAt: this.now() + options.expirationTtl * 1000 }),
    })
  }
}
