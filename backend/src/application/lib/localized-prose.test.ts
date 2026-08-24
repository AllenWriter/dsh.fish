import { describe, expect, it } from 'vitest'
import { slug } from '../../domain/shared/slug.js'
import { translatedReadme, translatedSummary } from './localized-prose.js'

const artifactId = slug('dsh-hello')
const updatedAt = new Date()

describe('translatedReadme', () => {
  it('serves a completed translation even when its source hash is from a previous policy', () => {
    expect(
      translatedReadme({
        artifactId,
        locale: 'zh-CN',
        sourceHash: 'previous-policy',
        status: 'completed',
        markdown: '# 你好',
        updatedAt,
      }),
    ).toEqual({ markdown: '# 你好', locale: 'zh-CN' })
  })

  it('keeps the previous body while a replacement is pending or failed', () => {
    expect(
      translatedReadme({
        artifactId,
        locale: 'ja',
        sourceHash: 'new-policy',
        status: 'pending',
        markdown: '# こんにちは',
        updatedAt,
      }),
    ).toEqual({ markdown: '# こんにちは', locale: 'ja' })
    expect(
      translatedReadme({
        artifactId,
        locale: 'ko',
        sourceHash: 'new-policy',
        status: 'failed',
        markdown: '# 안녕',
        error: 'rate limited',
        updatedAt,
      }),
    ).toEqual({ markdown: '# 안녕', locale: 'ko' })
  })

  it('does not invent prose for an empty pending or failed row', () => {
    expect(
      translatedReadme({
        artifactId,
        locale: 'ru',
        sourceHash: 'new-policy',
        status: 'pending',
        updatedAt,
      }),
    ).toBeUndefined()
    expect(
      translatedReadme({
        artifactId,
        locale: 'en',
        sourceHash: 'new-policy',
        status: 'failed',
        error: 'unauthorized',
        updatedAt,
      }),
    ).toBeUndefined()
  })
})

describe('translatedSummary', () => {
  it('serves retained summary text the same way', () => {
    expect(
      translatedSummary({
        artifactId,
        locale: 'zh-TW',
        sourceHash: 'stale',
        status: 'completed',
        text: '一個套件。',
        updatedAt,
      }),
    ).toBe('一個套件。')
    expect(
      translatedSummary({
        artifactId,
        locale: 'zh-TW',
        sourceHash: 'new',
        status: 'pending',
        updatedAt,
      }),
    ).toBeUndefined()
  })
})
