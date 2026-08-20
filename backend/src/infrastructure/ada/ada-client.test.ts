import { describe, expect, it, vi } from 'vitest'
import { DomainError } from '../../domain/shared/error.js'
import {
  AdaClient,
  mapAdaFrame,
  splitCites,
  type AdaSocket,
} from './ada-client.js'

class FakeSocket implements AdaSocket {
  private readonly listeners = new Map<string, Array<(event: { data?: unknown }) => void>>()
  private readonly buffered: Array<{ type: string; data?: unknown }> = []

  addEventListener(
    type: 'message' | 'open' | 'close' | 'error',
    listener: (event: { data?: unknown }) => void,
  ): void {
    const bucket = this.listeners.get(type) ?? []
    bucket.push(listener)
    this.listeners.set(type, bucket)
    const pending = this.buffered.filter((item) => item.type === type)
    const rest = this.buffered.filter((item) => item.type !== type)
    this.buffered.length = 0
    this.buffered.push(...rest)
    for (const item of pending) listener({ data: item.data })
  }

  emit(type: string, data?: unknown): void {
    const bucket = this.listeners.get(type) ?? []
    if (bucket.length === 0) {
      this.buffered.push({ type, data })
      return
    }
    for (const listener of bucket) listener({ data })
  }

  close(): void {
    this.emit('close')
  }
}

async function collect(client: AdaClient, question = 'What is this?', queryId?: string) {
  const session = await client.start({
    repoName: 'acme/hello',
    question,
    ...(queryId === undefined ? {} : { queryId }),
    source: 'ada.dsh_fish',
  })
  const events = []
  for await (const event of session.events) events.push(event)
  return { queryId: session.queryId, events }
}

describe('mapAdaFrame', () => {
  it('maps file_contents, chunks with cites, and done — never the file body', () => {
    expect(mapAdaFrame(JSON.stringify({ queries: [] }))).toEqual([])
    expect(
      mapAdaFrame(
        JSON.stringify({
          file_contents: ['acme/hello', 'src/index.ts', 'secret file body'],
        }),
      ),
    ).toEqual([{ type: 'file', repo: 'acme/hello', path: 'src/index.ts' }])
    expect(JSON.stringify(mapAdaFrame(JSON.stringify({ file_contents: ['acme/hello', 'src/index.ts', 'secret'] })))).not.toContain('secret')

    const chunk = mapAdaFrame(
      JSON.stringify({
        type: 'chunk',
        text: 'Hello <cite repo="acme/hello" path="src/index.ts" start="1" end="12" />world',
      }),
    )
    expect(chunk).toEqual([
      { type: 'cite', repo: 'acme/hello', path: 'src/index.ts', start: 1, end: 12 },
      { type: 'delta', text: 'Hello world' },
    ])
    expect(mapAdaFrame(JSON.stringify({ type: 'done' }))).toEqual([{ type: 'done' }])
  })

  it('maps live Ada Fast tokens on chunk.data', () => {
    expect(mapAdaFrame(JSON.stringify({ type: 'chunk', data: 'Hello ' }))).toEqual([
      { type: 'delta', text: 'Hello ' },
    ])
    expect(mapAdaFrame(JSON.stringify({ type: 'chunk', data: 'world' }))).toEqual([
      { type: 'delta', text: 'world' },
    ])
    expect(mapAdaFrame(JSON.stringify({ state: 'done' }))).toEqual([{ type: 'done' }])
  })

  it('skips malformed JSON instead of throwing', () => {
    expect(mapAdaFrame('not-json{')).toEqual([])
  })
})

describe('splitCites', () => {
  it('strips every cite tag from the visible text', () => {
    const events = splitCites(
      'See <cite repo="a/b" path="x.ts" start="2" end="4" /> and <cite repo="a/b" path="y.ts" start="8" end="9" />.',
    )
    expect(events.filter((event) => event.type === 'cite')).toHaveLength(2)
    expect(events.find((event) => event.type === 'delta')).toEqual({ type: 'delta', text: 'See  and .' })
  })
})

describe('AdaClient', () => {
  it('POSTs Fast mode then yields mapped socket frames', async () => {
    const socket = new FakeSocket()
    let posted: unknown
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      posted = JSON.parse(String(init?.body))
      return new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    })
    const client = new AdaClient({
      fetch: fetchImpl,
      openSocket: async () => socket,
    })

    queueMicrotask(() => {
      socket.emit('message', JSON.stringify({ file_contents: ['acme/hello', 'README.md', 'body'] }))
      socket.emit(
        'message',
        JSON.stringify({ type: 'chunk', text: 'It <cite repo="acme/hello" path="README.md" start="1" end="3" />queries.' }),
      )
      socket.emit('message', JSON.stringify({ type: 'done' }))
    })

    const { events, queryId } = await collect(client, 'What does it do?')
    expect(queryId.startsWith('what-does-it-do_') || queryId.includes('_')).toBe(true)
    expect(posted).toMatchObject({
      mode: 'fast',
      user_query: 'What does it do?',
      repo_names: ['acme/hello'],
      source: 'ada.dsh_fish',
      use_notes: false,
    })
    expect(events).toEqual([
      { type: 'file', repo: 'acme/hello', path: 'README.md' },
      { type: 'cite', repo: 'acme/hello', path: 'README.md', start: 1, end: 3 },
      { type: 'delta', text: 'It queries.' },
      { type: 'done' },
    ])
  })

  it('reuses a follow-up queryId', async () => {
    const socket = new FakeSocket()
    let posted: { query_id?: string } = {}
    const client = new AdaClient({
      fetch: async (_url, init) => {
        posted = JSON.parse(String(init?.body)) as { query_id?: string }
        return new Response('{}', { status: 200 })
      },
      openSocket: async () => socket,
    })
    queueMicrotask(() => socket.emit('message', JSON.stringify({ type: 'done' })))
    const session = await collect(client, 'And then?', 'kept-query_uuid')
    expect(posted.query_id).toBe('kept-query_uuid')
    expect(session.queryId).toBe('kept-query_uuid')
  })

  it('maps upstream 429 to UNAVAILABLE with retryAfter', async () => {
    const client = new AdaClient({
      fetch: async () =>
        new Response('nope', { status: 429, headers: { 'retry-after': '12' } }),
      openSocket: async () => new FakeSocket(),
    })
    await expect(
      client.start({ repoName: 'acme/hello', question: 'Hi', source: 'ada.dsh_fish' }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(DomainError)
      const domain = error as DomainError
      expect(domain.code).toBe('UNAVAILABLE')
      expect(domain.details.rateLimited).toBe(true)
      expect(domain.details.retryAfter).toBe(12)
      return true
    })
  })

  it('times out a hang before Ada speaks', async () => {
    const socket = new FakeSocket()
    const client = new AdaClient({
      fetch: async () => new Response('{}', { status: 200 }),
      openSocket: async () => socket,
      idleTimeoutMs: 20,
      totalTimeoutMs: 50,
      connectTimeoutMs: 20,
    })
    const { events } = await collect(client)
    expect(events.some((event) => event.type === 'error')).toBe(true)
  })
})
