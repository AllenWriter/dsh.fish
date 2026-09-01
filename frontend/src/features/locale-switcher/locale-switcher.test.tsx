import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { LocaleProvider } from '@/shared/config/i18n'
import { LocaleLinks } from './ui/locale-links'

describe('LocaleLinks', () => {
  it('keeps the same post slug when switching en, zh-CN, and ja', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/blog/tech/one-inbox']}>
        <LocaleProvider locale="en">
          <LocaleLinks />
        </LocaleProvider>
      </MemoryRouter>,
    )

    expect(html).toContain('href="/blog/tech/one-inbox"')
    expect(html).toContain('href="/en/blog/tech/one-inbox"')
    expect(html).toContain('href="/ja/blog/tech/one-inbox"')
    expect(html).not.toContain('href="/zh-CN/blog/tech/one-inbox"')
  })

  it('prefixes a Chinese post URL back to English and Japanese of the same slug', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/zh-CN/blog/tech/one-inbox']}>
        <LocaleProvider locale="zh-CN">
          <LocaleLinks />
        </LocaleProvider>
      </MemoryRouter>,
    )

    expect(html).toContain('href="/blog/tech/one-inbox"')
    expect(html).toContain('href="/en/blog/tech/one-inbox"')
    expect(html).toContain('href="/ja/blog/tech/one-inbox"')
    expect(html).not.toContain('href="/zh-CN/blog/tech/one-inbox"')
  })

  it('keeps the same docs slug under /docs, /zh-CN/docs, and /ja/docs', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/docs/dify-plugin-agent']}>
        <LocaleProvider locale="en">
          <LocaleLinks />
        </LocaleProvider>
      </MemoryRouter>,
    )

    expect(html).toContain('href="/docs/dify-plugin-agent"')
    expect(html).toContain('href="/en/docs/dify-plugin-agent"')
    expect(html).toContain('href="/ja/docs/dify-plugin-agent"')
    expect(html).not.toContain('href="/zh-CN/docs/dify-plugin-agent"')
    expect(html).not.toContain('href="/docs/dify-plugin-agent.zh-CN"')
  })

  it('maps a Chinese docs URL back to the English and Japanese paths of the same slug', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/zh-CN/docs/dify-docs-engineering']}>
        <LocaleProvider locale="zh-CN">
          <LocaleLinks />
        </LocaleProvider>
      </MemoryRouter>,
    )

    expect(html).toContain('href="/docs/dify-docs-engineering"')
    expect(html).toContain('href="/en/docs/dify-docs-engineering"')
    expect(html).toContain('href="/ja/docs/dify-docs-engineering"')
    expect(html).not.toContain('href="/zh-CN/docs/dify-docs-engineering"')
  })
})
