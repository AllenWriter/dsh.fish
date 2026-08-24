import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ICON_WEIGHT, IconDefaults, SearchIcon, type Icon } from './index'
import * as icons from './icons'

/** Every alias the product may reach for, paired with the name it is known by. */
const SET: readonly [string, Icon][] = Object.entries(icons)

function render(node: ReactElement): string {
  return renderToStaticMarkup(<IconDefaults>{node}</IconDefaults>)
}

describe('the icon set', () => {
  it('exports a glyph for every alias, and nothing that is not one', () => {
    expect(SET.length).toBeGreaterThan(0)
    for (const [name, Glyph] of SET) {
      expect(typeof Glyph, `${name} must be a component`).not.toBe('undefined')
      const html = render(<Glyph />)
      expect(html, name).toContain('<svg')
      // Phosphor's own grid. Brand marks are scaled onto it; a glyph that
      // skipped `shared/ui/icon` would not have this viewBox.
      expect(html, name).toContain('viewBox="0 0 256 256"')
      expect(html, name).toMatch(/<path|<circle|<rect|<line|<polyline/)
    }
  })

  it('draws every glyph in currentColor, so CSS owns hover, active and disabled', () => {
    for (const [name, Glyph] of SET) {
      const html = render(<Glyph />)
      expect(html, name).toContain('fill="currentColor"')
      // A baked colour would make one state need a second asset.
      expect(html, name).not.toMatch(/fill="#|stroke="#/)
    }
  })

  it('offers each of the three weights the product uses for every glyph', () => {
    for (const [name, Glyph] of SET) {
      for (const weight of Object.values(ICON_WEIGHT)) {
        const html = render(<Glyph weight={weight} />)
        expect(html, `${name} at ${weight}`).toMatch(/<path|<circle|<rect|<line|<polyline/)
      }
    }
  })
})

describe('icon weight', () => {
  it('changes the drawing, so the text-weight rule is not silently ignored', () => {
    const body = render(<SearchIcon weight={ICON_WEIGHT.BODY} />)
    const label = render(<SearchIcon weight={ICON_WEIGHT.LABEL} />)
    const active = render(<SearchIcon weight={ICON_WEIGHT.ACTIVE} />)

    expect(body).not.toEqual(label)
    expect(label).not.toEqual(active)
  })

  it('names the three roles this product has, and only those', () => {
    expect(ICON_WEIGHT).toEqual({ BODY: 'regular', LABEL: 'bold', ACTIVE: 'fill' })
  })
})

describe('IconDefaults', () => {
  it('sizes an unstyled glyph to the cap height of the text around it', () => {
    expect(render(<SearchIcon />)).toContain('width="1em"')
    expect(render(<SearchIcon />)).toContain('height="1em"')
  })

  it('lets a control state an exact box when it needs one', () => {
    const html = render(<SearchIcon className="size-4" />)
    expect(html).toContain('class="size-4"')
  })

  it('defaults to the weight body copy wants, not to a heavier one', () => {
    expect(render(<SearchIcon />)).toEqual(render(<SearchIcon weight={ICON_WEIGHT.BODY} />))
  })
})

describe('an icon as markup', () => {
  it('is silent to assistive technology without a call site asking', () => {
    // Every mark here accompanies a label, so announcing the glyph too would
    // read the same thing twice. Making it the default is what stops the one
    // call site that forgets from being the one that regresses.
    for (const [name, Glyph] of SET) {
      expect(render(<Glyph />), name).toContain('aria-hidden="true"')
    }
  })

  it('carries no title of its own, so a decorative glyph adds no tooltip', () => {
    expect(render(<SearchIcon />)).not.toContain('<title>')
  })

  it('lets a caller announce a glyph that ever needs it', () => {
    const html = render(<SearchIcon aria-hidden={false} alt="Search" />)
    expect(html).toContain('<title>Search</title>')
    expect(html).toContain('aria-hidden="false"')
  })
})
