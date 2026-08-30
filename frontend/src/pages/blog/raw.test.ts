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

const EDITORIAL = [
  '/blog/harness/v0-1-2-alpha-1',
  '/blog/deepseek/v4-preview',
  '/blog/changelog/2026-08',
  '/blog/notes/everything-is-a-plugin',
] as const

const WRITER_SHORTS = [
  '/blog/notes/one-inbox',
  '/blog/notes/staff-pipeline',
  '/blog/notes/style-is-a-person',
  '/blog/notes/agents-not-demos',
] as const

const POSTS = [...EDITORIAL, ...WRITER_SHORTS] as const

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
    expect(blogPostMarkdown('/blog/notes/one-inbox')).toContain(
      'New things go into Inbox',
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

  it('has a physical translation of every editorial post in every public locale', () => {
    for (const path of EDITORIAL) {
      expect(blogLocales(path), path).toEqual(LOCALE_CODES)
    }
    expect(blogLocales('/blog')).toEqual(LOCALE_CODES)
    expect(blogLocales('/blog/notes')).toEqual(LOCALE_CODES)
  })

  it('ships writer shorts in English and Simplified Chinese only', () => {
    for (const path of WRITER_SHORTS) {
      expect(blogLocales(path), path).toEqual(['en', 'zh-CN'])
    }
  })

  it('lists Simplified Chinese titles on /blog without duplicating translations', () => {
    const index = blogMarkdown('/blog', 'zh-CN')
    expect(index).toContain('只留一个入口')
    expect(index).toContain('岗群跑起来之后')
    expect(index).toContain('风格是人，不是体裁')
    expect(index).toContain('用 Agent 做节目，不是做 Demo')
    expect(index).toContain('一切都是插件')
    expect(index).not.toContain('Leave only one inbox')
    expect(index).toContain('](/blog/notes/one-inbox)')

    const english = blogMarkdown('/blog', 'en')
    expect(english).toContain('Leave only one inbox')
    expect(english).not.toContain('只留一个入口')
    expect(blogPostMarkdownPaths()).toHaveLength(8)
  })

  it('returns localized Markdown and falls back to English', () => {
    expect(blogMarkdown('/blog/changelog/2026-08', 'zh-CN')).toContain(
      '产品文档',
    )
    expect(blogMarkdown('/blog/harness/v0-1-2-alpha-1', 'ja')).toContain(
      'ApiProxy',
    )
    expect(blogMarkdown('/blog/notes/one-inbox', 'zh-CN')).toContain(
      '只留一个入口',
    )
    expect(blogMarkdown('/blog/notes/one-inbox', 'ja')).toContain(
      'Leave only one inbox',
    )
    expect(blogMarkdown('/blog/not-a-post', 'ja')).toBeUndefined()
  })
})
