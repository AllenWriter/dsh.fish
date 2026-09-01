import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { LocaleProvider } from '@/shared/config/i18n'
import { SiteFooter } from './site-footer'

describe('SiteFooter', () => {
  it('is a compact sitemap with RSS, not a plugin-kind directory', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LocaleProvider locale="en">
          <SiteFooter />
        </LocaleProvider>
      </MemoryRouter>,
    )

    expect(html).toContain('href="/en/blog"')
    expect(html).toContain('href="/en/docs"')
    expect(html).toContain('href="/en/blog/feed.xml"')
    expect(html).not.toContain('href="/browse"')
    expect(html).toContain('Open RSS')
    expect(html).toContain('Follow by RSS')
    expect(html).not.toContain('type="email"')
    expect(html).not.toContain('href="/submit"')
    expect(html).not.toContain('href="/kind/')
    expect(html).not.toContain('href="/category/')
    expect(html).not.toContain('href="/for/')
    expect(html).not.toContain('Discord')
    expect(html).not.toContain('textLength')
    expect(html).toContain('admilk47')
  })
})
