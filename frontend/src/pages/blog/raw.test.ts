import { describe, expect, it } from 'vitest'
import { LOCALE_CODES } from '@/shared/config/i18n'
import { BLOG_SERIES, isBlogSeries } from './series'
import {
  blogLocales,
  blogMarkdown,
  blogPostMarkdown,
  blogPostMarkdownPaths,
  supportsBlogMarkdown,
} from './raw'

const POSTS = [
  '/blog/harness/v0-1-2-alpha-1',
  '/blog/deepseek/v4-preview',
  '/blog/changelog/2026-08',
  '/blog/notes/everything-is-a-plugin',
] as const

describe('isBlogSeries', () => {
  it('accepts the four editorial series and nothing else', () => {
    expect(BLOG_SERIES).toEqual(['harness', 'deepseek', 'changelog', 'notes'])
    for (const series of BLOG_SERIES) expect(isBlogSeries(series)).toBe(true)
    expect(isBlogSeries('docs')).toBe(false)
    expect(isBlogSeries('harness/v0-1-2-alpha-1')).toBe(false)
  })
})

describe('blogMarkdown', () => {
  it('bundles every English post under /blog/{series}/{slug}', () => {
    expect(blogPostMarkdownPaths()).toEqual(
      [...POSTS].sort((left, right) => left.localeCompare(right)),
    )
    expect(blogPostMarkdown('/blog/harness/v0-1-2-alpha-1')).toContain(
      'dsh-v0.1.2-alpha.1',
    )
    expect(blogPostMarkdown('/blog/notes/everything-is-a-plugin')).toContain(
      'everything is a plugin',
    )
  })

  it('gives every post a public cover image', () => {
    for (const path of POSTS) {
      expect(blogPostMarkdown(path), path).toMatch(
        /\ncover: \/blog\/covers\/[a-z0-9-]+\.webp\n/,
      )
    }
  })

  it('treats the index and each series landing as documents', () => {
    expect(supportsBlogMarkdown('/blog')).toBe(true)
    expect(supportsBlogMarkdown('/blog/harness')).toBe(true)
    expect(supportsBlogMarkdown('/blog/feed.xml')).toBe(false)
    expect(supportsBlogMarkdown('/docs/cli')).toBe(false)
  })

  it('generates a listing that names every post', () => {
    const index = blogMarkdown('/blog')
    expect(index).toContain('title: Blog')
    for (const path of POSTS) {
      expect(index).toContain(`](${path})`)
    }

    const harness = blogMarkdown('/blog/harness')
    expect(harness).toContain('](/blog/harness/v0-1-2-alpha-1)')
    expect(harness).not.toContain('](/blog/notes/everything-is-a-plugin)')
  })

  it('serves the blog index in every public locale rather than a single post', () => {
    for (const locale of ['en', 'zh-CN', 'ja'] as const) {
      const index = blogMarkdown('/blog', locale)
      expect(index, locale).toContain('title:')
      expect(index, locale).not.toMatch(/^title: 2026-08/m)
      for (const path of POSTS) {
        expect(index, `${locale} ${path}`).toContain(`](${path})`)
      }
    }
  })

  it('has a physical translation of every post in every public locale', () => {
    for (const path of POSTS) {
      expect(blogLocales(path), path).toEqual(LOCALE_CODES)
    }
    expect(blogLocales('/blog')).toEqual(LOCALE_CODES)
    expect(blogLocales('/blog/notes')).toEqual(LOCALE_CODES)
  })

  it('returns localized Markdown and falls back to English', () => {
    expect(blogMarkdown('/blog/changelog/2026-08', 'zh-CN')).toContain(
      '产品文档',
    )
    expect(blogMarkdown('/blog/harness/v0-1-2-alpha-1', 'ja')).toContain(
      'ApiProxy',
    )
    expect(blogMarkdown('/blog/not-a-post', 'ja')).toBeUndefined()
  })
})
