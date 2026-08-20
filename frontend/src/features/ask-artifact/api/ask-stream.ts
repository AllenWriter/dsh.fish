export type AskEventType = 'file' | 'delta' | 'cite' | 'done' | 'error'

export type AskStreamEvent =
  | { type: 'file'; repo: string; path: string }
  | { type: 'delta'; text: string }
  | { type: 'cite'; repo: string; path: string; start: number; end: number }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface AskRequest {
  readonly artifactId: string
  readonly question: string
  readonly queryId?: string
}

export class AskHttpError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'AskHttpError'
  }
}

/**
 * POST the ask endpoint and yield mapped SSE events. Follow-ups pass the
 * previous `queryId` so Ada keeps the thread.
 */
export async function startAskStream(
  input: AskRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<{ queryId: string | undefined; events: AsyncIterable<AskStreamEvent> }> {
  const response = await fetchImpl(`/api/v1/artifacts/${encodeURIComponent(input.artifactId)}/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify({
      question: input.question,
      ...(input.queryId === undefined ? {} : { queryId: input.queryId }),
    }),
  })

  if (!response.ok) {
    throw await askHttpError(response)
  }

  const queryId = response.headers.get('X-Ask-Query-Id') ?? input.queryId
  const body = response.body
  if (body === null) {
    throw new AskHttpError('UNAVAILABLE', 'The Q&A service is temporarily unavailable.', 503)
  }

  return { queryId: queryId ?? undefined, events: readSse(body) }
}

export async function* readSse(body: ReadableStream<Uint8Array>): AsyncIterable<AskStreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const split = splitFrames(buffer)
      buffer = split.rest
      for (const frame of split.frames) {
        const event = parseSseFrame(frame)
        if (event !== undefined) yield event
      }
    }
    buffer += decoder.decode()
    const split = splitFrames(buffer)
    for (const frame of split.frames) {
      const event = parseSseFrame(frame)
      if (event !== undefined) yield event
    }
    if (split.rest.trim() !== '') {
      const event = parseSseFrame(split.rest)
      if (event !== undefined) yield event
    }
  } finally {
    reader.releaseLock()
  }
}

export function parseSseFrame(frame: string): AskStreamEvent | undefined {
  let eventName = 'message'
  const dataLines: string[] = []
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice('event:'.length).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trim())
  }
  if (dataLines.length === 0 && eventName === 'message') return undefined
  const raw = dataLines.join('\n')
  let data: Record<string, unknown> = {}
  if (raw !== '') {
    try {
      data = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return undefined
    }
  }
  return toAskEvent(eventName, data)
}

export function toAskEvent(type: string, data: Record<string, unknown>): AskStreamEvent | undefined {
  switch (type) {
    case 'file':
      return typeof data.repo === 'string' && typeof data.path === 'string'
        ? { type: 'file', repo: data.repo, path: data.path }
        : undefined
    case 'delta':
      return typeof data.text === 'string' ? { type: 'delta', text: data.text } : undefined
    case 'cite':
      return typeof data.repo === 'string' &&
        typeof data.path === 'string' &&
        typeof data.start === 'number' &&
        typeof data.end === 'number'
        ? { type: 'cite', repo: data.repo, path: data.path, start: data.start, end: data.end }
        : undefined
    case 'done':
      return { type: 'done' }
    case 'error':
      return {
        type: 'error',
        message: typeof data.message === 'string' ? data.message : 'The answer could not be completed.',
      }
    default:
      return undefined
  }
}

function splitFrames(buffer: string): { frames: string[]; rest: string } {
  const frames: string[] = []
  let rest = buffer
  for (;;) {
    const boundary = rest.indexOf('\n\n')
    if (boundary === -1) break
    frames.push(rest.slice(0, boundary))
    rest = rest.slice(boundary + 2)
  }
  return { frames, rest }
}

async function askHttpError(response: Response): Promise<AskHttpError> {
  const fallback = new AskHttpError('UNAVAILABLE', 'The Q&A service is temporarily unavailable.', response.status)
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } }
    if (typeof body.error?.code === 'string') {
      return new AskHttpError(
        body.error.code,
        typeof body.error.message === 'string' ? body.error.message : fallback.message,
        response.status,
      )
    }
  } catch {
    return fallback
  }
  return fallback
}
