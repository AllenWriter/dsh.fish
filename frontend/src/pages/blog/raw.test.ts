import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALE_CODES } from '@/shared/config/i18n'
import { BLOG_SERIES, isBlogSeries } from './series'
import {
  blogLocales,
  blogMarkdown,
  blogPostMarkdown,
  blogPostMarkdownPaths,
  supportsBlogMarkdown,
} from './raw'

const POSTS = [
  '/blog/finance/airlines-dont-make-money-on-tickets',
  '/blog/finance/australia-delivery-gigs',
  '/blog/finance/bullshit-jobs',
  '/blog/finance/diamonds-are-forever',
  '/blog/finance/dont-dca-qqq',
  '/blog/finance/first-listed-company',
  '/blog/finance/first-listed-company-collapse',
  '/blog/finance/futures-epic',
  '/blog/finance/hermes-vanished-fortune',
  '/blog/finance/nobel-econ-tech-explosion',
  '/blog/finance/trump-bankruptcy-comeback',
  '/blog/finance/trump-family-prequel',
  '/blog/finance/trump-rise-part-2',
  '/blog/finance/us-railroad-bubble',
  '/blog/life/art-of-war-sun-tzu',
  '/blog/life/ask-and-then-what',
  '/blog/life/aspirin-thousand-year-secret',
  '/blog/life/common-thinking-fallacies',
  '/blog/life/dayun-stadium',
  '/blog/life/edison-the-man',
  '/blog/life/fanta-wwii-black-history',
  '/blog/life/first-blog',
  '/blog/life/gunpowder-and-fireworks',
  '/blog/life/horse-year-fengshui-2026',
  '/blog/life/how-atomic-bomb-was-made',
  '/blog/life/how-atomic-bomb-was-made-part-2',
  '/blog/life/ice-to-fridge-part-1',
  '/blog/life/ice-to-fridge-part-2',
  '/blog/life/killing-superbugs',
  '/blog/life/liuyang-fireworks-capital',
  '/blog/life/musk-family-education',
  '/blog/life/newton-other-side',
  '/blog/life/penicillin-accident',
  '/blog/life/qingshanzhi',
  '/blog/life/riddle-quiz-1',
  '/blog/life/riddle-quiz-2',
  '/blog/life/salmon-on-the-altar',
  '/blog/life/secret-of-glass',
  '/blog/life/sparta-300',
  '/blog/life/speak-clearly-first',
  '/blog/life/story-of-msg',
  '/blog/life/thinking-traps',
  '/blog/life/watermelon-summer-god',
  '/blog/life/why-carrots-for-eyes',
  '/blog/life/why-steak-is-rare',
  '/blog/life/world-cup-football',
  '/blog/tech/agents-not-demos',
  '/blog/tech/anthropic-dario-amodei',
  '/blog/tech/blue-led-invention',
  '/blog/tech/crazy-saturday-dinner',
  '/blog/tech/crazy-saturday-offline',
  '/blog/tech/how-internet-was-born',
  '/blog/tech/how-internet-was-born-part-2',
  '/blog/tech/jensen-huang-nvidia-01',
  '/blog/tech/mars-immigration',
  '/blog/tech/moon-landing-hard-tech',
  '/blog/tech/musk-spacex-legend',
  '/blog/tech/one-inbox',
  '/blog/tech/staff-pipeline',
  '/blog/tech/starliner-space-rescue',
  '/blog/tech/style-is-a-person',
  '/blog/tech/why-220v-and-110v',
  '/blog/tech/wwii-computing-war-part-1',
  '/blog/tech/wwii-computing-war-part-2',
  '/blog/tech/wwii-computing-war-part-3',
  '/blog/travel/japan-trip-notes',
] as const

const TRANSLATED_POSTS = [
  '/blog/finance/airlines-dont-make-money-on-tickets',
  '/blog/finance/bullshit-jobs',
  '/blog/finance/diamonds-are-forever',
  '/blog/finance/first-listed-company-collapse',
  '/blog/finance/first-listed-company',
  '/blog/finance/hermes-vanished-fortune',
  '/blog/finance/trump-bankruptcy-comeback',
  '/blog/finance/trump-family-prequel',
  '/blog/finance/trump-rise-part-2',
  '/blog/finance/us-railroad-bubble',
  '/blog/life/common-thinking-fallacies',
  '/blog/life/edison-the-man',
  '/blog/life/gunpowder-and-fireworks',
  '/blog/life/how-atomic-bomb-was-made-part-2',
  '/blog/life/killing-superbugs',
  '/blog/life/newton-other-side',
  '/blog/life/penicillin-accident',
  '/blog/life/riddle-quiz-1',
  '/blog/life/riddle-quiz-2',
  '/blog/life/salmon-on-the-altar',
  '/blog/life/secret-of-glass',
  '/blog/life/thinking-traps',
  '/blog/life/watermelon-summer-god',
  '/blog/life/why-steak-is-rare',
  '/blog/life/world-cup-football',
  '/blog/tech/agents-not-demos',
  '/blog/tech/how-internet-was-born-part-2',
  '/blog/tech/how-internet-was-born',
  '/blog/tech/moon-landing-hard-tech',
  '/blog/tech/one-inbox',
  '/blog/tech/staff-pipeline',
  '/blog/tech/style-is-a-person',
  '/blog/tech/why-220v-and-110v',
  '/blog/tech/wwii-computing-war-part-1',
  '/blog/tech/wwii-computing-war-part-2',
  '/blog/tech/wwii-computing-war-part-3',
  '/blog/travel/japan-trip-notes',
] as const

describe('isBlogSeries', () => {
  it('accepts the four public tags and nothing else', () => {
    expect(BLOG_SERIES).toEqual(['tech', 'life', 'finance', 'travel'])
    for (const series of BLOG_SERIES) expect(isBlogSeries(series)).toBe(true)
    expect(isBlogSeries('docs')).toBe(false)
    expect(isBlogSeries('notes')).toBe(false)
    expect(isBlogSeries('tech/one-inbox')).toBe(false)
  })
})

describe('blogMarkdown', () => {
  it('bundles every default-language post under /blog/{series}/{slug}', () => {
    expect(blogPostMarkdownPaths()).toEqual(
      [...POSTS].sort((left, right) => left.localeCompare(right)),
    )
    expect(blogPostMarkdown('/blog/tech/one-inbox')).toContain(
      '只留一个入口',
    )
    expect(blogPostMarkdown('/blog/tech/one-inbox', 'en')).toContain(
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
    expect(supportsBlogMarkdown('/blog/tech')).toBe(true)
    expect(supportsBlogMarkdown('/blog/feed.xml')).toBe(false)
    expect(supportsBlogMarkdown('/docs/cli')).toBe(false)
  })

  it('generates a listing that names every post', () => {
    const index = blogMarkdown('/blog', 'en')
    expect(index).toContain('title: Blog')
    for (const path of POSTS) {
      expect(index).toContain(`](${path})`)
    }

    const tech = blogMarkdown('/blog/tech', 'en')
    expect(tech).toContain('](/blog/tech/one-inbox)')
    expect(tech).not.toContain('](/blog/life/')
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

  it('has a physical translation of every fully localized post', () => {
    for (const path of TRANSLATED_POSTS) {
      expect(blogLocales(path), path).toEqual(LOCALE_CODES)
    }
    expect(blogLocales('/blog')).toEqual(LOCALE_CODES)
    expect(blogLocales('/blog/tech')).toEqual(LOCALE_CODES)
  })

  it('still exposes a default-language file for every remaining post', () => {
    for (const path of POSTS) {
      expect(blogLocales(path), path).toContain(DEFAULT_LOCALE)
    }
  })

  it('lists Simplified Chinese titles on /blog without duplicating translations', () => {
    const index = blogMarkdown('/blog', 'zh-CN')
    expect(index).toContain('只留一个入口')
    expect(index).toContain('岗群跑起来之后')
    expect(index).toContain('风格是人，不是体裁')
    expect(index).toContain('用 Agent 做节目，不是做 Demo')
    expect(index).not.toContain('Leave only one inbox')
    expect(index).toContain('](/blog/tech/one-inbox)')

    const english = blogMarkdown('/blog', 'en')
    expect(english).toContain('Leave only one inbox')
    expect(english).not.toContain('只留一个入口')
    expect(blogPostMarkdownPaths()).toHaveLength(POSTS.length)
  })

  it('returns localized Markdown and falls back to the default language', () => {
    expect(blogMarkdown('/blog/tech/one-inbox', 'zh-CN')).toContain(
      '只留一个入口',
    )
    expect(blogMarkdown('/blog/tech/one-inbox', 'ja')).toContain(
      '入口は一つだけ残す',
    )
    expect(blogMarkdown('/blog/not-a-post', 'ja')).toBeUndefined()
  })
})
