import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { LocaleProvider } from '@/shared/config/i18n'
import { SiteFooter } from './site-footer'

describe('SiteFooter', () => {
  it('is a short identity footer, not a plugin-kind directory', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LocaleProvider locale="en">
          <SiteFooter />
        </LocaleProvider>
      </MemoryRouter>,
    )

    expect(html).toContain('href="/blog"')
    expect(html).toContain('href="/docs"')
    expect(html).toContain('href="/browse"')
    expect(html).toContain('蓝健声 (AllenWriter)')
    expect(html).toContain('GitHub')
    expect(html).not.toContain('href="/submit"')
    expect(html).not.toContain('href="/kind/')
    expect(html).not.toContain('href="/category/')
    expect(html).not.toContain('href="/for/')
    expect(html).not.toContain('Discord')
  })
})
