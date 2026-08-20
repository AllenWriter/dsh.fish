import { Hono } from 'hono'
import { z } from 'zod'
import { ASK_QUESTION_MAX_CHARS } from '../../../application/use-case/ask-artifact.js'
import type { AskEvent } from '../../../application/port/artifact-ask.js'
import { isDomainError } from '../../../domain/shared/error.js'
import { toApiError } from '../error-mapper.js'
import type { HubBindings } from '../app.js'

const askBody = z.object({
  question: z.string().min(1).max(ASK_QUESTION_MAX_CHARS),
  queryId: z.string().min(1).max(200).optional(),
})

/**
 * Streaming ask. Pre-stream failures keep the JSON error envelope; a started
 * stream is `text/event-stream` with mapped Ada events.
 */
export function askRoutes() {
  const routes = new Hono<HubBindings>()

  routes.post('/artifacts/:id/ask', async (context) => {
    const parsed = askBody.parse(await context.req.json())
    const session = await context.get('container').useCases.askArtifact.execute({
      artifactId: context.req.param('id'),
      question: parsed.question,
      ...(parsed.queryId === undefined ? {} : { queryId: parsed.queryId }),
      ip: clientIp(context.req.header('cf-connecting-ip')),
    })

    const body = sseStream(session.events)
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
        'X-Ask-Query-Id': session.queryId,
      },
    })
  })

  return routes
}

export function clientIp(connecting: string | undefined): string {
  const value = connecting?.trim()
  return value === undefined || value === '' ? 'unknown' : value
}

export function formatSse(event: AskEvent): string {
  const { type, ...data } = event
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
}

function sseStream(events: AsyncIterable<AskEvent>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(formatSse(event)))
          if (event.type === 'done' || event.type === 'error') break
        }
      } catch (error) {
        if (isDomainError(error)) {
          const { body } = toApiError(error)
          controller.enqueue(
            encoder.encode(
              formatSse({ type: 'error', message: body.error.message }),
            ),
          )
        } else {
          controller.enqueue(
            encoder.encode(formatSse({ type: 'error', message: 'Unexpected server error.' })),
          )
        }
      } finally {
        controller.close()
      }
    },
  })
}
