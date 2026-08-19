import { describe, expect, it, vi } from 'vitest'
import {
  DEEPSEEK_CHAT_COMPLETIONS_URL,
  DeepSeekPeakSuspension,
  isDeepSeekPeakHour,
  translateReadmeWithDeepSeek,
} from './deepseek-readme-translator.js'

/** Beijing 09:00-12:00 and 14:00-18:00 are 01:00-04:00 and 06:00-10:00 UTC. */
const OFF_PEAK = new Date('2026-08-19T00:00:00Z')
const PEAK = new Date('2026-08-19T02:00:00Z')

describe('DeepSeek README translation', () => {
  it('suspends itself during peak pricing hours without calling the API', async () => {
    const fetcher = vi.fn()

    await expect(
      translateReadmeWithDeepSeek('test-key', '# Hello', 'zh-CN', fetcher, PEAK),
    ).rejects.toBeInstanceOf(DeepSeekPeakSuspension)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('maps the Beijing peak windows onto UTC hours', () => {
    expect(isDeepSeekPeakHour(new Date('2026-08-19T00:59:59Z'))).toBe(false)
    expect(isDeepSeekPeakHour(new Date('2026-08-19T01:00:00Z'))).toBe(true)
    expect(isDeepSeekPeakHour(new Date('2026-08-19T03:59:59Z'))).toBe(true)
    expect(isDeepSeekPeakHour(new Date('2026-08-19T04:00:00Z'))).toBe(false)
    expect(isDeepSeekPeakHour(new Date('2026-08-19T06:00:00Z'))).toBe(true)
    expect(isDeepSeekPeakHour(new Date('2026-08-19T09:59:59Z'))).toBe(true)
    expect(isDeepSeekPeakHour(new Date('2026-08-19T10:00:00Z'))).toBe(false)
  })

  it('calls the official endpoint with thinking disabled and Markdown first', async () => {
    const requests: { input: RequestInfo | URL; init?: RequestInit }[] = []
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ input, ...(init === undefined ? {} : { init }) })
      return Response.json({ choices: [{ message: { content: '# 你好' } }] })
    })

    await expect(
      translateReadmeWithDeepSeek('test-key', '# Hello', 'zh-CN', fetcher, OFF_PEAK),
    ).resolves.toBe('# 你好')

    expect(fetcher).toHaveBeenCalledOnce()
    const request = requests[0]!
    expect(request.input).toBe(DEEPSEEK_CHAT_COMPLETIONS_URL)
    expect(request.init?.headers).toMatchObject({ authorization: 'Bearer test-key' })
    const body = JSON.parse(String(request.init?.body))
    expect(body).toMatchObject({
      model: 'deepseek-v4-flash',
      thinking: { type: 'disabled' },
      temperature: 0,
    })
    // The Markdown leads the payload so per-artifact locale calls share one
    // cached prefix.
    expect(String(body.messages[1].content)).toMatch(/^\{"markdown":/)
  })

  it('logs billed usage with the provider tag', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const fetcher = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: '# 你好' } }],
        usage: {
          prompt_tokens: 1_400,
          completion_tokens: 1_500,
          prompt_cache_hit_tokens: 1_200,
          prompt_cache_miss_tokens: 200,
        },
      }),
    )

    await translateReadmeWithDeepSeek('test-key', '# Hello', 'zh-CN', fetcher, OFF_PEAK)

    expect(log).toHaveBeenCalledWith(
      'readme_i18n_usage',
      JSON.stringify({
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        locale: 'zh-CN',
        promptTokens: 1_400,
        completionTokens: 1_500,
        promptCacheHitTokens: 1_200,
        promptCacheMissTokens: 200,
      }),
    )
    log.mockRestore()
  })

  it('reports a bounded provider error without exposing the API key', async () => {
    const fetcher = vi.fn(async () => new Response('insufficient balance', { status: 402 }))

    await expect(
      translateReadmeWithDeepSeek('test-key', '# Hello', 'fr', fetcher, OFF_PEAK),
    ).rejects.toThrow(/HTTP 402: insufficient balance/)
    await expect(
      translateReadmeWithDeepSeek('test-key', '# Hello', 'fr', fetcher, OFF_PEAK),
    ).rejects.not.toThrow(/test-key/)
  })
})
