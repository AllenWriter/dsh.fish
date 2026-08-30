import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { LocaleProvider } from '@/shared/config/i18n'
import { SiteHeader } from './site-header'

describe('SiteHeader', () => {
  it('leads with Blog and Docs, keeps Browse secondary, and drops Submit', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LocaleProvider locale="en">
          <SiteHeader />
        </LocaleProvider>
      </MemoryRouter>,
    )

    expect(html).toContain('href="/blog"')
    expect(html).toContain('href="/docs"')
    expect(html).toContain('href="/browse"')
    expect(html).not.toContain('href="/submit"')
    expect(html).not.toContain('Discord')
    expect(html).toContain('Blog')
    expect(html).toContain('Docs')
    expect(html).toContain('Browse')
  })
})
