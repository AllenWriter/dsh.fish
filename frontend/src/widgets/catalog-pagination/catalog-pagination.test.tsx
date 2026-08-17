import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { LocaleProvider, translate } from '@/shared/config/i18n'
import { IconDefaults, NextPageIcon, PreviousPageIcon } from '@/shared/ui/icon'
import { drawsGlyph } from '@/shared/ui/icon/icon.fixture'
import { CatalogPagination } from './catalog-pagination'

/**
 * Covered here rather than end to end because the seeded local catalog holds
 * seven rows against a page size of twenty-four, so a browser never reaches a
 * second page to click through.
 */
function render(offset: number, total = 100) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <IconDefaults>
        <LocaleProvider locale="en">
          <CatalogPagination basePath="/browse" total={total} limit={24} offset={offset} />
        </LocaleProvider>
      </IconDefaults>
    </MemoryRouter>,
  )
}

describe('catalog pagination', () => {
  it('points each way with a caret rather than an arrow character', () => {
    const html = render(24)
    // `&larr;` and `&rarr;` were the previous affordance: two glyphs from the
    // text font, at the text's own weight, that no icon rule could reach.
    expect(html).not.toContain('←')
    expect(html).not.toContain('→')
    expect(drawsGlyph(html, PreviousPageIcon, 'bold')).toBe(true)
    expect(drawsGlyph(html, NextPageIcon, 'bold')).toBe(true)
  })

  it('names each direction for a reader as well as for a screen reader', () => {
    const html = render(24)
    expect(html).toContain(translate('en', 'browse.previous'))
    expect(html).toContain(translate('en', 'browse.next'))
    // The label is hidden on the narrowest screens, where the caret carries it
    // alone and the `aria-label` is what remains.
    expect(html).toContain('hidden sm:inline')
    expect(html).toContain(`aria-label="${translate('en', 'browse.previous')}"`)
  })

  it('offers only the directions that exist', () => {
    const first = render(0)
    expect(drawsGlyph(first, PreviousPageIcon, 'bold')).toBe(false)
    expect(drawsGlyph(first, NextPageIcon, 'bold')).toBe(true)

    const last = render(96)
    expect(drawsGlyph(last, PreviousPageIcon, 'bold')).toBe(true)
    expect(drawsGlyph(last, NextPageIcon, 'bold')).toBe(false)
  })

  it('gives each control a 44px row to be tapped in', () => {
    expect(render(24)).toContain('h-11')
  })

  it('stays absent when there is only one page', () => {
    expect(render(0, 24)).toBe('')
  })
})
