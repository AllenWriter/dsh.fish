import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { LocaleProvider } from '@/shared/config/i18n'
import { LocaleLinks } from './ui/locale-links'

describe('LocaleLinks', () => {
  it('keeps the same post slug when switching en, zh-CN, and ja', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/blog/notes/one-inbox']}>
        <LocaleProvider locale="en">
          <LocaleLinks />
        </LocaleProvider>
      </MemoryRouter>,
    )

    expect(html).toContain('href="/blog/notes/one-inbox"')
    expect(html).toContain('href="/zh-CN/blog/notes/one-inbox"')
    expect(html).toContain('href="/ja/blog/notes/one-inbox"')
  })

  it('prefixes a Chinese post URL back to English and Japanese of the same slug', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/zh-CN/blog/notes/one-inbox']}>
        <LocaleProvider locale="zh-CN">
          <LocaleLinks />
        </LocaleProvider>
      </MemoryRouter>,
    )

    expect(html).toContain('href="/blog/notes/one-inbox"')
    expect(html).toContain('href="/zh-CN/blog/notes/one-inbox"')
    expect(html).toContain('href="/ja/blog/notes/one-inbox"')
  })
})
