import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALE_CODES } from '@/shared/config/i18n'
import { BLOG_SERIES, isBlogSeries } from './series'
import { diskBlogMdxReader } from './read-mdx.node'
import {
  blogLocales,
  blogMarkdown,
  blogPostMarkdown,
  blogPostMarkdownPaths,
  supportsBlogMarkdown,
} from './raw'

const POSTS = [
  '/blog/finance/dont-dca-qqq',
  '/blog/finance/futures-epic',
  '/blog/life/dayun-stadium',
  '/blog/life/first-blog',
  '/blog/life/horse-year-fengshui-2026',
  '/blog/life/qingshanzhi',
  '/blog/podcast/airlines-dont-make-money-on-tickets',
  '/blog/podcast/art-of-war-sun-tzu',
  '/blog/podcast/ask-and-then-what',
  '/blog/podcast/aspirin-thousand-year-secret',
  '/blog/podcast/australia-delivery-gigs',
  '/blog/podcast/blue-led-invention',
  '/blog/podcast/bullshit-jobs',
  '/blog/podcast/common-thinking-fallacies',
  '/blog/podcast/diamonds-are-forever',
  '/blog/podcast/edison-the-man',
  '/blog/podcast/fanta-wwii-black-history',
  '/blog/podcast/first-listed-company',
  '/blog/podcast/first-listed-company-collapse',
  '/blog/podcast/gunpowder-and-fireworks',
  '/blog/podcast/hermes-vanished-fortune',
  '/blog/podcast/how-atomic-bomb-was-made',
  '/blog/podcast/how-atomic-bomb-was-made-part-2',
  '/blog/podcast/how-internet-was-born',
  '/blog/podcast/how-internet-was-born-part-2',
  '/blog/podcast/ice-to-fridge-part-1',
  '/blog/podcast/ice-to-fridge-part-2',
  '/blog/podcast/japan-trip-notes',
  '/blog/podcast/jensen-huang-nvidia-01',
  '/blog/podcast/killing-superbugs',
  '/blog/podcast/liuyang-fireworks-capital',
  '/blog/podcast/mars-immigration',
  '/blog/podcast/moon-landing-hard-tech',
  '/blog/podcast/musk-family-education',
  '/blog/podcast/musk-spacex-legend',
  '/blog/podcast/newton-other-side',
  '/blog/podcast/nobel-econ-tech-explosion',
  '/blog/podcast/penicillin-accident',
  '/blog/podcast/riddle-quiz-1',
  '/blog/podcast/riddle-quiz-2',
  '/blog/podcast/salmon-on-the-altar',
  '/blog/podcast/secret-of-glass',
  '/blog/podcast/sparta-300',
  '/blog/podcast/speak-clearly-first',
  '/blog/podcast/starliner-space-rescue',
  '/blog/podcast/story-of-msg',
  '/blog/podcast/thinking-traps',
  '/blog/podcast/trump-bankruptcy-comeback',
  '/blog/podcast/trump-family-prequel',
  '/blog/podcast/trump-rise-part-2',
  '/blog/podcast/us-railroad-bubble',
  '/blog/podcast/watermelon-summer-god',
  '/blog/podcast/why-220v-and-110v',
  '/blog/podcast/why-carrots-for-eyes',
  '/blog/podcast/why-steak-is-rare',
  '/blog/podcast/world-cup-football',
  '/blog/podcast/wwii-computing-war-part-1',
  '/blog/podcast/wwii-computing-war-part-2',
  '/blog/podcast/wwii-computing-war-part-3',
  '/blog/tech/agents-not-demos',
  '/blog/tech/anthropic-dario-amodei',
  '/blog/tech/crazy-saturday-dinner',
  '/blog/tech/crazy-saturday-offline',
  '/blog/tech/one-inbox',
  '/blog/tech/staff-pipeline',
  '/blog/tech/style-is-a-person',
] as const

const TRANSLATED_POSTS = [
  '/blog/podcast/airlines-dont-make-money-on-tickets',
  '/blog/podcast/bullshit-jobs',
  '/blog/podcast/common-thinking-fallacies',
  '/blog/podcast/diamonds-are-forever',
  '/blog/podcast/edison-the-man',
  '/blog/podcast/first-listed-company',
  '/blog/podcast/first-listed-company-collapse',
  '/blog/podcast/gunpowder-and-fireworks',
  '/blog/podcast/hermes-vanished-fortune',
  '/blog/podcast/how-atomic-bomb-was-made-part-2',
  '/blog/podcast/how-internet-was-born',
  '/blog/podcast/how-internet-was-born-part-2',
  '/blog/podcast/japan-trip-notes',
  '/blog/podcast/killing-superbugs',
  '/blog/podcast/moon-landing-hard-tech',
  '/blog/podcast/newton-other-side',
  '/blog/podcast/penicillin-accident',
  '/blog/podcast/riddle-quiz-1',
  '/blog/podcast/riddle-quiz-2',
  '/blog/podcast/salmon-on-the-altar',
  '/blog/podcast/secret-of-glass',
  '/blog/podcast/thinking-traps',
  '/blog/podcast/trump-bankruptcy-comeback',
  '/blog/podcast/trump-family-prequel',
  '/blog/podcast/trump-rise-part-2',
  '/blog/podcast/us-railroad-bubble',
  '/blog/podcast/watermelon-summer-god',
  '/blog/podcast/why-220v-and-110v',
  '/blog/podcast/why-steak-is-rare',
  '/blog/podcast/world-cup-football',
  '/blog/podcast/wwii-computing-war-part-1',
  '/blog/podcast/wwii-computing-war-part-2',
  '/blog/podcast/wwii-computing-war-part-3',
  '/blog/tech/agents-not-demos',
  '/blog/tech/one-inbox',
  '/blog/tech/staff-pipeline',
  '/blog/tech/style-is-a-person',
] as const

const read = diskBlogMdxReader

describe('isBlogSeries', () => {
  it('accepts the public tags and nothing else', () => {
    expect(BLOG_SERIES).toEqual(['podcast', 'tech', 'life', 'finance', 'travel'])
    for (const series of BLOG_SERIES) expect(isBlogSeries(series)).toBe(true)
    expect(isBlogSeries('docs')).toBe(false)
    expect(isBlogSeries('notes')).toBe(false)
    expect(isBlogSeries('tech/one-inbox')).toBe(false)
  })
})

describe('blogMarkdown', () => {
  it('lists every default-language post under /blog/{series}/{slug}', async () => {
    expect(blogPostMarkdownPaths()).toEqual(
      [...POSTS].sort((left, right) => left.localeCompare(right)),
    )
    expect(await blogPostMarkdown('/blog/tech/one-inbox', 'zh-CN', read)).toContain(
      '只留一个入口',
    )
    expect(await blogPostMarkdown('/blog/tech/one-inbox', 'en', read)).toContain(
      'New things go into Inbox',
    )
  })

  it('gives every post a public cover image', async () => {
    for (const path of POSTS) {
      expect(await blogPostMarkdown(path, 'zh-CN', read), path).toMatch(
        /\ncover: \/blog\/covers\/[a-z0-9-]+\.webp\n/,
      )
    }
  })

  it('treats the index and each series landing as documents', () => {
    expect(supportsBlogMarkdown('/blog')).toBe(true)
    expect(supportsBlogMarkdown('/blog/tech')).toBe(true)
    expect(supportsBlogMarkdown('/blog/podcast')).toBe(true)
    expect(supportsBlogMarkdown('/blog/feed.xml')).toBe(false)
    expect(supportsBlogMarkdown('/docs/cli')).toBe(false)
  })

  it('generates a listing that names every post', async () => {
    const index = await blogMarkdown('/blog', 'en')
    expect(index).toContain('title: Blog')
    for (const path of POSTS) {
      expect(index).toContain(`](${path})`)
    }

    const tech = await blogMarkdown('/blog/tech', 'en')
    expect(tech).toContain('](/blog/tech/one-inbox)')
    expect(tech).not.toContain('](/blog/life/')
  })

  it('serves the blog index in every public locale rather than a single post', async () => {
    for (const locale of ['en', 'zh-CN', 'ja'] as const) {
      const index = await blogMarkdown('/blog', locale)
      expect(index, locale).toContain('title:')
      expect(index, locale).not.toMatch(/^title: 2026-08/m)
      for (const path of POSTS) {
        expect(index, `${locale} ${path}`).toContain(`](${path})`)
      }
    }
  })

  it('has a physical translation of every fully localized post', () => {
    for (const path of TRANSLATED_POSTS) {
      expect(blogLocales(path), path).toEqual(LOCALE_CODES)
    }
    expect(blogLocales('/blog')).toEqual(LOCALE_CODES)
    expect(blogLocales('/blog/tech')).toEqual(LOCALE_CODES)
    expect(blogLocales('/blog/podcast')).toEqual(LOCALE_CODES)
  })

  it('still exposes a default-language file for every remaining post', () => {
    for (const path of POSTS) {
      expect(blogLocales(path), path).toContain(DEFAULT_LOCALE)
    }
  })

  it('lists Simplified Chinese titles on /blog without duplicating translations', async () => {
    const index = await blogMarkdown('/blog', 'zh-CN')
    expect(index).toContain('只留一个入口')
    expect(index).toContain('岗群跑起来之后')
    expect(index).toContain('风格是人，不是体裁')
    expect(index).toContain('用 Agent 做节目，不是做 Demo')
    expect(index).not.toContain('Leave only one inbox')
    expect(index).toContain('](/blog/tech/one-inbox)')

    const english = await blogMarkdown('/blog', 'en')
    expect(english).toContain('Leave only one inbox')
    expect(english).not.toContain('只留一个入口')
    expect(blogPostMarkdownPaths()).toHaveLength(POSTS.length)
  })

  it('returns localized Markdown and falls back to the default language', async () => {
    expect(await blogMarkdown('/blog/tech/one-inbox', 'zh-CN', read)).toContain(
      '只留一个入口',
    )
    expect(await blogMarkdown('/blog/tech/one-inbox', 'ja', read)).toContain(
      '入口は一つだけ残す',
    )
    expect(await blogMarkdown('/blog/not-a-post', 'ja', read)).toBeUndefined()
  })
})
