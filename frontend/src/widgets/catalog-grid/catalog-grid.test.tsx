import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { LocaleProvider, translate } from '@/shared/config/i18n'
import { IconDefaults, SearchIcon, VerifiedIcon, WarningIcon } from '@/shared/ui/icon'
import { drawsGlyph } from '@/shared/ui/icon/icon.fixture'
import { kindIcon } from '@/entities/artifact/model/icons'
import type { Artifact } from '@/entities/artifact/model/types'
import { mockArtifact, mockCatalog } from '@/entities/artifact/model/artifact.fixture'
import { CatalogGrid } from './catalog-grid'

function render(artifacts: readonly Artifact[]): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <IconDefaults>
        <LocaleProvider locale="en">
          <CatalogGrid artifacts={artifacts} />
        </LocaleProvider>
      </IconDefaults>
    </MemoryRouter>,
  )
}

/** How many `<svg>` elements the markup contains. */
function glyphCount(html: string): number {
  return html.split('<svg').length - 1
}

describe('a catalog grid of mock rows', () => {
  const catalog = mockCatalog()

  it('marks every row with the glyph its own kind owns', () => {
    const html = render(catalog)
    expect(glyphCount(html)).toBeGreaterThanOrEqual(catalog.length)
    for (const artifact of catalog) {
      expect(html).toContain(artifact.displayName)
      expect(drawsGlyph(html, kindIcon(artifact.kind), 'bold'), artifact.kind).toBe(true)
    }
  })

  it('seals a verified row, filled rather than outlined', () => {
    const verified = render([mockArtifact({ verified: true })])
    expect(verified).toContain(translate('en', 'artifact.verified'))
    // Verification is an affirmed state, and one of the two places this palette
    // spends its single accent.
    expect(drawsGlyph(verified, VerifiedIcon, 'fill')).toBe(true)
    expect(drawsGlyph(verified, VerifiedIcon, 'regular')).toBe(false)

    expect(drawsGlyph(render([mockArtifact({ verified: false })]), VerifiedIcon, 'fill')).toBe(false)
  })

  it('warns on a deprecated row', () => {
    const deprecated = render([mockArtifact({ deprecated: true })])
    expect(deprecated).toContain(translate('en', 'artifact.deprecated'))
    expect(drawsGlyph(deprecated, WarningIcon, 'bold')).toBe(true)
  })

  it('shows a stat only when the number behind it exists', () => {
    const starsOnly = render([mockArtifact({ stats: { stars: 12, downloads: 0, installs: 0 } })])
    const neither = render([mockArtifact({ stats: { stars: 0, downloads: 0, installs: 0 } })])

    // A dead `0 star` on every row would add noise to serve nothing, so the
    // marks must disappear with their numbers.
    expect(glyphCount(starsOnly)).toBeGreaterThan(glyphCount(neither))
  })

  it('never draws a glyph a screen reader would announce', () => {
    const html = render(catalog)
    expect(html).not.toContain('<title>')
    expect(glyphCount(html)).toBe(html.split('aria-hidden="true"').length - 1)
  })
})

describe('an empty catalog grid', () => {
  it('says what happened, and marks it with the control that produced it', () => {
    const html = render([])
    expect(html).toContain(translate('en', 'browse.empty'))
    expect(html).toContain(translate('en', 'browse.emptyHint'))
    // The search that came back empty, in the mark of the control that ran it.
    expect(drawsGlyph(html, SearchIcon)).toBe(true)
    // Its own mark plus one on each of the two ways forward.
    expect(glyphCount(html)).toBe(3)
  })

  it('offers both ways forward as reachable targets', () => {
    const html = render([])
    expect(html).toContain(translate('en', 'browse.clearFilters'))
    expect(html).toContain(translate('en', 'nav.submit'))
    // 44px of thumb, not a line of text.
    expect(html).toContain('min-h-11')
  })
})
