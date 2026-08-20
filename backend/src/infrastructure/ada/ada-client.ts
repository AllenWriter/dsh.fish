import { DomainError } from '../../domain/shared/error.js'
import type {
  ArtifactAskInput,
  ArtifactAskPort,
  ArtifactAskSession,
  AskEvent,
} from '../../application/port/artifact-ask.js'

export const ADA_QUERY_URL = 'https://api.devin.ai/ada/query'
export const ADA_WS_PATH = 'https://api.devin.ai/ada/ws/query/'

export const ADA_CONNECT_TIMEOUT_MS = 10_000
export const ADA_IDLE_TIMEOUT_MS = 30_000
export const ADA_TOTAL_TIMEOUT_MS = 60_000

const CITE =
  /<cite\s+repo="([^"]+)"\s+path="([^"]+)"\s+start="(\d+)"\s+end="(\d+)"\s*\/>/g

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/**
 * Minimal socket the Ada client reads. Workers `WebSocket` and the test fake
 * both satisfy this; the production opener uses `fetch` Upgrade.
 */
export interface AdaSocket {
  addEventListener(
    type: 'message' | 'open' | 'close' | 'error',
    listener: (event: { data?: unknown }) => void,
  ): void
  close(): void
}

export type OpenAdaSocket = (url: string) => Promise<AdaSocket>

export interface AdaClientOptions {
  readonly fetch?: FetchLike
  readonly openSocket?: OpenAdaSocket
  readonly now?: () => number
  readonly connectTimeoutMs?: number
  readonly idleTimeoutMs?: number
  readonly totalTimeoutMs?: number
}

/**
 * Unofficial Ada proxy: POST to queue a Fast query, then stream mapped frames
 * from the query WebSocket. Ada JSON never leaves this module.
 */
export class AdaClient implements ArtifactAskPort {
  private readonly fetch: FetchLike
  private readonly openSocket: OpenAdaSocket
  private readonly now: () => number
  private readonly connectTimeoutMs: number
  private readonly idleTimeoutMs: number
  private readonly totalTimeoutMs: number

  constructor(options: AdaClientOptions = {}) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.openSocket = options.openSocket ?? defaultOpenSocket(this.fetch)
    this.now = options.now ?? Date.now
    this.connectTimeoutMs = options.connectTimeoutMs ?? ADA_CONNECT_TIMEOUT_MS
    this.idleTimeoutMs = options.idleTimeoutMs ?? ADA_IDLE_TIMEOUT_MS
    this.totalTimeoutMs = options.totalTimeoutMs ?? ADA_TOTAL_TIMEOUT_MS
  }

  async start(input: ArtifactAskInput): Promise<ArtifactAskSession> {
    const queryId = input.queryId?.trim() || adaQueryId(input.question)
    const started = this.now()
    const response = await this.fetch(ADA_QUERY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode: 'fast',
        user_query: input.question,
        keywords: [],
        repo_names: [input.repoName],
        additional_context: '',
        query_id: queryId,
        use_notes: false,
        generate_summary: false,
        source: input.source,
      }),
    })

    if (response.status === 429 || response.status >= 500) {
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
      console.info(
        JSON.stringify({
          event: 'ada_query',
          queryId,
          status: response.status,
          durationMs: this.now() - started,
        }),
      )
      throw DomainError.unavailable('The Q&A service is temporarily unavailable.', {
        ...(retryAfter === undefined ? {} : { retryAfter }),
        ...(response.status === 429 ? { rateLimited: true } : {}),
      })
    }

    if (!response.ok) {
      console.info(
        JSON.stringify({
          event: 'ada_query',
          queryId,
          status: response.status,
          durationMs: this.now() - started,
        }),
      )
      throw DomainError.unavailable('The Q&A service is temporarily unavailable.', {
        status: response.status,
      })
    }

    const socket = await this.connect(queryId)
    return {
      queryId,
      events: this.subscribe(queryId, started, socket),
    }
  }

  private subscribe(
    queryId: string,
    started: number,
    socket: AdaSocket,
  ): AsyncIterable<AskEvent> {
    const queue: Array<AskEvent | { type: 'end' } | { type: 'fail'; error: Error }> = []
    let notify: (() => void) | undefined
    const wake = () => notify?.()
    let lastMessageAt = this.now()

    const onMessage = (event: { data?: unknown }) => {
      lastMessageAt = this.now()
      const raw = typeof event.data === 'string' ? event.data : String(event.data ?? '')
      for (const mapped of mapAdaFrame(raw)) {
        queue.push(mapped)
      }
      wake()
    }
    const onClose = () => {
      queue.push({ type: 'end' })
      wake()
    }
    const onError = () => {
      queue.push({ type: 'fail', error: new Error('Ada stream failed.') })
      wake()
    }

    socket.addEventListener('message', onMessage)
    socket.addEventListener('close', onClose)
    socket.addEventListener('error', onError)

    const now = this.now
    const idleTimeoutMs = this.idleTimeoutMs
    const totalTimeoutMs = this.totalTimeoutMs

    return {
      async *[Symbol.asyncIterator]() {
        let finished = false
        try {
          while (!finished) {
            const elapsed = now() - started
            if (elapsed >= totalTimeoutMs) {
              yield { type: 'error', message: 'The Q&A service timed out.' }
              break
            }
            if (now() - lastMessageAt >= idleTimeoutMs) {
              yield { type: 'error', message: 'The Q&A service timed out.' }
              break
            }

            if (queue.length === 0) {
              const remaining = Math.max(
                1,
                Math.min(idleTimeoutMs - (now() - lastMessageAt), totalTimeoutMs - elapsed),
              )
              await Promise.race([
                new Promise<void>((resolve) => {
                  notify = resolve
                }),
                sleep(remaining),
              ])
              continue
            }

            const next = queue.shift()
            if (next === undefined) continue
            if (next.type === 'end') {
              finished = true
              break
            }
            if (next.type === 'fail') {
              yield { type: 'error', message: 'The Q&A service is temporarily unavailable.' }
              finished = true
              break
            }
            yield next
            if (next.type === 'done' || next.type === 'error') {
              finished = true
            }
          }
        } finally {
          socket.close()
          console.info(
            JSON.stringify({
              event: 'ada_query',
              queryId,
              status: finished ? 'closed' : 'aborted',
              durationMs: now() - started,
            }),
          )
        }
      },
    }
  }

  private async connect(queryId: string): Promise<AdaSocket> {
    const url = `${ADA_WS_PATH}${encodeURIComponent(queryId)}`
    const timeout = abortableTimeout(
      this.connectTimeoutMs,
      DomainError.unavailable('The Q&A service timed out.', { phase: 'connect' }),
    )
    try {
      return await Promise.race([this.openSocket(url), timeout.promise])
    } catch (error) {
      if (error instanceof DomainError) throw error
      throw DomainError.unavailable('The Q&A service is temporarily unavailable.', {
        phase: 'websocket',
      })
    } finally {
      timeout.cancel()
    }
  }
}

function defaultOpenSocket(fetchImpl: FetchLike): OpenAdaSocket {
  return async (url) => {
    const response = await fetchImpl(url, { headers: { Upgrade: 'websocket' } })
    const socket = (response as Response & { webSocket?: AdaSocket & { accept?: () => void } })
      .webSocket
    if (!socket) {
      throw DomainError.unavailable('The Q&A service is temporarily unavailable.', {
        phase: 'websocket',
      })
    }
    socket.accept?.()
    return socket
  }
}

/**
 * Ada's frontend id: slug of the first 30 sanitized characters, underscore, UUID.
 */
export function adaQueryId(question: string, uuid: string = crypto.randomUUID()): string {
  const slug =
    question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30)
      .replace(/-+$/g, '') || 'ask'
  return `${slug}_${uuid}`
}

export function mapAdaFrame(raw: string): AskEvent[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (typeof parsed !== 'object' || parsed === null) return []
  const frame = parsed as Record<string, unknown>
  const events: AskEvent[] = []

  const files = frame.file_contents
  if (Array.isArray(files)) {
    if (typeof files[0] === 'string' && typeof files[1] === 'string') {
      events.push({ type: 'file', repo: files[0], path: files[1] })
    } else {
      for (const entry of files) {
        if (Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'string') {
          events.push({ type: 'file', repo: entry[0], path: entry[1] })
        }
      }
    }
  }

  const chunk = chunkText(frame)
  if (chunk !== undefined) {
    events.push(...splitCites(chunk))
  }

  if (frame.type === 'done' || frame.done === true || frame.state === 'done') {
    events.push({ type: 'done' })
  }

  return events
}

function chunkText(frame: Record<string, unknown>): string | undefined {
  // Live Ada Fast frames are `{ type: "chunk", data: "<token>" }`. The other
  // shapes are recorded fixtures and older public clients.
  if (frame.type === 'chunk' && typeof frame.data === 'string') return frame.data
  if (typeof frame.chunk === 'string') return frame.chunk
  if (frame.type === 'chunk' && typeof frame.text === 'string') return frame.text
  if (frame.type === 'chunk' && typeof frame.delta === 'string') return frame.delta
  if (typeof frame.chunk === 'object' && frame.chunk !== null) {
    const inner = frame.chunk as Record<string, unknown>
    if (typeof inner.text === 'string') return inner.text
    if (typeof inner.data === 'string') return inner.data
  }
  return undefined
}

export function splitCites(text: string): AskEvent[] {
  const events: AskEvent[] = []
  let stripped = text
  const cites = [...text.matchAll(CITE)]
  for (const match of cites) {
    events.push({
      type: 'cite',
      repo: match[1]!,
      path: match[2]!,
      start: Number(match[3]),
      end: Number(match[4]),
    })
  }
  stripped = text.replace(CITE, '')
  if (stripped.length > 0) {
    events.push({ type: 'delta', text: stripped })
  }
  return events
}

export function parseRetryAfter(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.floor(seconds)
  const when = Date.parse(value)
  if (Number.isNaN(when)) return undefined
  return Math.max(0, Math.ceil((when - Date.now()) / 1000))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function abortableTimeout(ms: number, error: DomainError): { promise: Promise<never>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  const promise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(error), ms)
  })
  return {
    promise,
    cancel: () => {
      if (timer !== undefined) clearTimeout(timer)
    },
  }
}
