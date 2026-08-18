import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { LocaleProvider } from '@/shared/config/i18n'
import { IconDefaults } from '@/shared/ui/icon'
import { AuthorCard } from './author-card'

function render(author: { name: string; url?: string }) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <IconDefaults>
        <LocaleProvider locale="en">
          <AuthorCard author={author} />
        </LocaleProvider>
      </IconDefaults>
    </MemoryRouter>,
  )
}

describe('AuthorCard', () => {
  it('shows the author name and a beui avatar slot', () => {
    const html = render({ name: 'titanwings', url: 'https://github.com/titanwings' })
    expect(html).toContain('Author')
    expect(html).toContain('titanwings')
    expect(html).toContain('https://github.com/titanwings.png?size=128')
    expect(html).toContain('href="https://github.com/titanwings"')
    expect(html).toContain('rel="noreferrer noopener ugc"')
  })

  it('does not invent a portrait for a non-GitHub author', () => {
    const html = render({ name: 'Ada Lovelace', url: 'https://example.com/ada' })
    expect(html).toContain('Ada Lovelace')
    expect(html).toContain('href="https://example.com/ada"')
    expect(html).not.toContain('github.com/')
    expect(html).not.toContain('<img')
  })

  it('is not a link when the catalog has no profile URL', () => {
    const html = render({ name: 'community' })
    expect(html).toContain('community')
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('<img')
  })
})
