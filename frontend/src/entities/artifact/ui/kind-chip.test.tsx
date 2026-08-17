import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider, translate } from '@/shared/config/i18n'
import { IconDefaults } from '@/shared/ui/icon'
import { drawsGlyph } from '@/shared/ui/icon/icon.fixture'
import { KindChip } from './kind-chip'
import { kindIcon } from '../model/icons'
import { ARTIFACT_KINDS, kindLabelKey } from '../model/types'

function render(kind: (typeof ARTIFACT_KINDS)[number]): string {
  return renderToStaticMarkup(
    <IconDefaults>
      <LocaleProvider locale="en">
        <KindChip kind={kind} />
      </LocaleProvider>
    </IconDefaults>,
  )
}

describe('KindChip', () => {
  it('carries the kind twice — as a mark and as the word', () => {
    for (const kind of ARTIFACT_KINDS) {
      const html = render(kind)
      expect(html, kind).toContain('<svg')
      expect(html, kind).toContain(translate('en', kindLabelKey(kind)))
    }
  })

  it('draws the mark that kind owns, at the weight its label wants', () => {
    // `bold` beside 500-weight text: Phosphor's bold is 24/256 of the rendered
    // size, which is the ~2px stroke a medium label carries optically.
    for (const kind of ARTIFACT_KINDS) {
      const html = render(kind)
      expect(drawsGlyph(html, kindIcon(kind), 'bold'), kind).toBe(true)
      expect(drawsGlyph(html, kindIcon(kind), 'regular'), kind).toBe(false)
    }
  })

  it('draws a different mark for each kind', () => {
    const marks = ARTIFACT_KINDS.map((kind) => render(kind).replace(/mock \w+/, ''))
    expect(new Set(marks).size).toBe(ARTIFACT_KINDS.length)
  })

  it('keeps the mark silent, so a reader is not told the kind twice', () => {
    for (const kind of ARTIFACT_KINDS) {
      expect(render(kind), kind).toContain('aria-hidden="true"')
    }
  })

  it('stays colourless: the accent is spent on verification and the primary action', () => {
    for (const kind of ARTIFACT_KINDS) {
      const html = render(kind)
      expect(html, kind).not.toMatch(/text-(primary|destructive|accent)/)
      expect(html, kind).not.toMatch(/bg-(primary|destructive|accent)/)
    }
  })

  it('gives the mark and the word room between them at every kind', () => {
    // Without the gap the glyph touches its label at 12px, which reads as one
    // smudged mark rather than a chip.
    for (const kind of ARTIFACT_KINDS) {
      expect(render(kind), kind).toContain('gap-1.5')
    }
  })
})
