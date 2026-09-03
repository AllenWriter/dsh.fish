import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { LocaleProvider } from '@/shared/config/i18n'
import { BlogArticle, BlogNewsroom, filterNewsroomPosts } from './index'
import type { BlogPostCard, BlogSeriesNavItem } from './model/types'

const TABS: readonly BlogSeriesNavItem[] = [
  { id: 'all', href: '/blog', title: 'All' },
  { id: 'podcast', href: '/blog/podcast', title: 'Podcast' },
  { id: 'tech', href: '/blog/tech', title: 'Tech' },
  { id: 'life', href: '/blog/life', title: 'Life' },
  { id: 'finance', href: '/blog/finance', title: 'Markets' },
  { id: 'travel', href: '/blog/travel', title: 'Travel' },
]

const NOTES: BlogPostCard = {
  url: '/blog/tech/one-inbox',
  title: 'Leave only one inbox',
  description: 'Two rules for a content factory.',
  date: '2026-08-30T00:00:00.000Z',
  seriesId: 'tech',
  seriesTitle: 'Tech',
  cover: '/blog/covers/one-inbox.webp',
}

const LIFE: BlogPostCard = {
  url: '/blog/life/a-day',
  title: 'A day in the city',
  description: 'Walking home.',
  date: '2026-08-29T00:00:00.000Z',
  seriesId: 'life',
  seriesTitle: 'Life',
  cover: '/blog/covers/one-inbox.webp',
}

const ZH_NOTES: BlogPostCard = {
  ...NOTES,
  title: '只留一个入口',
  description: '新东西只丢进素材，要拿走的只从节目目录拿。',
  seriesTitle: '技术',
}

function render(node: React.ReactNode, locale: 'en' | 'zh-CN' | 'ja' = 'en') {
  return renderToStaticMarkup(
    <MemoryRouter>
      <LocaleProvider locale={locale}>{node}</LocaleProvider>
    </MemoryRouter>,
  )
}

describe('filterNewsroomPosts', () => {
  it('keeps every card for All and filters by series otherwise', () => {
    const posts = [NOTES, LIFE]
    expect(filterNewsroomPosts(posts, 'all')).toEqual(posts)
    expect(filterNewsroomPosts(posts, 'tech')).toEqual([NOTES])
    expect(filterNewsroomPosts(posts, 'life')).toEqual([LIFE])
    expect(filterNewsroomPosts(posts, 'travel')).toEqual([])
  })
})

describe('BlogNewsroom', () => {
  it('renders 4:3 tiles with a series pill, date, title, and post link', () => {
    const html = render(
      <BlogNewsroom
        posts={[NOTES]}
        tabs={TABS}
        title="Latest writing"
        subtitle="Writing and notes"
      />,
    )

    expect(html).toContain('src="/blog/covers/one-inbox.webp"')
    expect(html).toMatch(/<img[^>]*alt=""/)
    expect(html).toContain('href="/en/blog/tech/one-inbox"')
    expect(html).toContain('aspect-[4/3]')
    expect(html).toContain('rounded-2xl')
    expect(html).toContain('Tech')
    expect(html).toContain('Leave only one inbox')
    expect(html).toContain('Journal')
    expect(html).toContain('role="tablist"')
    expect(html).toContain('All')
    expect(html).toContain('Life')
  })

  it('client-filters to the active series on first paint', () => {
    const html = render(
      <BlogNewsroom
        posts={[NOTES, LIFE]}
        tabs={TABS}
        title="Latest writing"
        activeSeries="tech"
      />,
    )

    expect(html).toContain('Leave only one inbox')
    expect(html).toContain('href="/en/blog/tech/one-inbox"')
    expect(html).not.toContain('A day in the city')
    expect(html).not.toContain('href="/en/blog/life/a-day"')
  })

  it('lists Simplified Chinese titles on a zh-CN newsroom', () => {
    const html = render(
      <BlogNewsroom
        posts={[ZH_NOTES]}
        tabs={[
          { id: 'all', href: '/blog', title: '全部' },
          { id: 'tech', href: '/blog/tech', title: '技术' },
        ]}
        title="最近在写"
      />,
      'zh-CN',
    )

    expect(html).toContain('只留一个入口')
    expect(html).toContain('全部')
    expect(html).toContain('技术')
    expect(html).toContain('手记')
    expect(html).not.toContain('Leave only one inbox')
  })
})

describe('BlogArticle', () => {
  it('renders Blog / series / title crumbs and no series tabs', () => {
    const html = render(
      <BlogArticle
        title="Leave only one inbox"
        description="Two rules for a content factory."
        author="Jens"
        date="2026-08-30T00:00:00.000Z"
        formattedDate="August 30, 2026"
        readingMinutes={2}
        cover="/blog/covers/one-inbox.webp"
        seriesId="tech"
        seriesTitle="Tech"
        related={[LIFE]}
      >
        <p>Body</p>
      </BlogArticle>,
    )

    expect(html).toContain('aria-label="Breadcrumb"')
    expect(html).toContain('href="/en/blog"')
    expect(html).toContain('href="/en/blog/tech"')
    expect(html).toContain('Tech')
    expect(html).toContain('Leave only one inbox')
    expect(html).toContain('Jens')
    expect(html).toContain('2 min read')
    expect(html).toContain('Written by')
    expect(html).toContain('Related')
    expect(html).not.toContain('role="tablist"')
    expect(html).not.toContain('On this page')
  })

  it('shows the on-this-page list when headings exist', () => {
    const html = render(
      <BlogArticle
        title="Leave only one inbox"
        description="Two rules for a content factory."
        author="Jens"
        date="2026-08-30T00:00:00.000Z"
        formattedDate="August 30, 2026"
        readingMinutes={2}
        cover="/blog/covers/one-inbox.webp"
        seriesId="tech"
        seriesTitle="Tech"
        related={[LIFE]}
        toc={[
          { title: 'The rehearsal', url: '#the-rehearsal', depth: 2 },
          { title: 'The shortest path', url: '#the-shortest-path', depth: 2 },
        ]}
      >
        <p>Body</p>
      </BlogArticle>,
    )

    expect(html).toContain('aria-label="On this page"')
    expect(html).toContain('The rehearsal')
    expect(html).toContain('href="#the-rehearsal"')
  })
})
