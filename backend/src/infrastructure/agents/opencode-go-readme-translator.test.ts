import { describe, expect, it, vi } from 'vitest'
import {
  extractTranslatedMarkdown,
  OPENCODE_GO_CHAT_COMPLETIONS_URL,
  OPENCODE_GO_MODELS,
  translateReadmeWithOpenCodeGo,
} from './opencode-go-readme-translator.js'

describe('OpenCode Go README translation', () => {
  it('calls DeepSeek V4 Flash through the documented chat-completions endpoint', async () => {
    const requests: { input: RequestInfo | URL; init?: RequestInit }[] = []
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ input, ...(init === undefined ? {} : { init }) })
      return Response.json({ choices: [{ message: { content: '# 你好' } }] })
    })

    await expect(
      translateReadmeWithOpenCodeGo('test-key', '# Hello', 'zh-CN', fetcher),
    ).resolves.toBe('# 你好')

    expect(fetcher).toHaveBeenCalledOnce()
    const request = requests[0]!
    expect(request.input).toBe(OPENCODE_GO_CHAT_COMPLETIONS_URL)
    expect(request.init?.headers).toMatchObject({ authorization: 'Bearer test-key' })
    expect(JSON.parse(String(request.init?.body))).toMatchObject({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'system' }, { role: 'user' }],
    })
  })

  it('falls through to the next model when the usage limit is reached', async () => {
    const models: string[] = []
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const model = String(JSON.parse(String(init?.body)).model)
      models.push(model)
      if (models.length === 1) {
        return new Response('rate limited', { status: 429 })
      }
      return Response.json({ choices: [{ message: { content: '# Bonjour' } }] })
    })

    await expect(
      translateReadmeWithOpenCodeGo('test-key', '# Hello', 'fr', fetcher),
    ).resolves.toBe('# Bonjour')

    expect(models).toEqual([OPENCODE_GO_MODELS[0], OPENCODE_GO_MODELS[1]])
  })

  it('reports every model once the whole fallback chain is exhausted', async () => {
    const fetcher = vi.fn(async () => new Response('rate limited', { status: 429 }))

    await expect(
      translateReadmeWithOpenCodeGo('test-key', '# Hello', 'fr', fetcher),
    ).rejects.toThrow(
      'OpenCode Go translation failed: deepseek-v4-flash responded HTTP 429: rate limited',
    )
    expect(fetcher).toHaveBeenCalledTimes(OPENCODE_GO_MODELS.length)
  })

  it('does not fall back on request or auth errors no model can heal', async () => {
    const fetcher = vi.fn(async () => new Response('unauthorized', { status: 401 }))

    await expect(
      translateReadmeWithOpenCodeGo('test-key', '# Hello', 'fr', fetcher),
    ).rejects.toThrow('deepseek-v4-flash responded HTTP 401: unauthorized')
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('rejects malformed or empty model output', () => {
    expect(() => extractTranslatedMarkdown({})).toThrow(
      'OpenCode Go returned an invalid chat-completions response.',
    )
    expect(() => extractTranslatedMarkdown({ choices: [{ message: { content: '' } }] })).toThrow(
      'OpenCode Go returned no translated Markdown.',
    )
  })

  it('reports a bounded provider error without exposing the API key', async () => {
    const fetcher = vi.fn(async () => new Response('rate limited', { status: 429 }))

    await expect(
      translateReadmeWithOpenCodeGo('test-key', '# Hello', 'fr', fetcher),
    ).rejects.toThrow(/HTTP 429: rate limited/)
    await expect(
      translateReadmeWithOpenCodeGo('test-key', '# Hello', 'fr', fetcher),
    ).rejects.not.toThrow(/test-key/)
  })
})
