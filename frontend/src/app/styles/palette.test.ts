import { describe, expect, it } from 'vitest'
import { contrast, hex, inSrgb, readPalettes, type Palette } from './palette'

const { light, dark, darkSystem } = readPalettes()

/**
 * Every foreground-on-background pair this product actually renders, with the WCAG
 * threshold that applies to it.
 *
 * All of these carry text, so 4.5 is the bar; the focus ring is the one non-text
 * item and takes 3.0 from WCAG 1.4.11. Borders are absent on purpose — `--line` and
 * `--line-strong` draw structure and hover feedback on surfaces a reader identifies
 * by their content, so raising them to a component threshold would make the whole
 * interface heavier for no accessibility gain.
 */
const RENDERED_PAIRS = [
  ['fg', 'bg', 4.5, 'body text on the page'],
  ['card-fg', 'card', 4.5, 'body text on a card'],
  ['fg', 'muted', 4.5, 'the label of a selected filter row'],
  ['muted-fg', 'bg', 4.5, 'summaries, captions, footer links'],
  ['muted-fg', 'card', 4.5, 'a card summary and its stats'],
  ['muted-fg', 'muted', 4.5, 'the kind chip label'],
  ['primary-fg', 'primary', 4.5, 'the primary button label'],
  ['primary', 'bg', 4.5, 'accent text on the page'],
  ['primary', 'card', 4.5, 'the verified badge, an active tab, a readme link'],
  ['primary', 'muted', 4.5, 'an active indicator on a muted surface'],
  ['destructive', 'bg', 4.5, 'an error message'],
  ['destructive', 'card', 4.5, 'the deprecated badge'],
  ['accent-fg', 'accent', 4.5, 'a beui component using the accent surface'],
  ['ring-color', 'bg', 3.0, 'the focus ring'],
  ['ring-color', 'card', 3.0, 'the focus ring over a card'],
] as const satisfies readonly [string, string, number, string][]

/** The hue sampled from `icons/whale-brand.png`, which the accent must be. */
const BRAND_HUE = 263
/** The hue every neutral shares, so the greys never disagree with each other. */
const NEUTRAL_HUE = 250

const THEMES: readonly [string, Palette][] = [
  ['light', light],
  ['dark', dark],
]

describe.each(THEMES)('the %s palette', (name, palette) => {
  it('declares every token the stylesheet consumes', () => {
    for (const token of [
      'bg',
      'fg',
      'card',
      'card-fg',
      'muted',
      'muted-fg',
      'primary',
      'primary-fg',
      'accent',
      'accent-fg',
      'destructive',
      'line',
      'line-strong',
      'ring-color',
    ]) {
      expect(palette[token], `--${token} in ${name}`).toBeDefined()
    }
  })

  it('is entirely inside sRGB, so what ships is what was authored', () => {
    // `oklch()` accepts a chroma no display can produce and the browser silently
    // gamut-maps it. Three tokens here used to, which is why this test exists.
    const outside = Object.entries(palette)
      .filter(([, colour]) => !inSrgb(colour))
      .map(([token, colour]) => `--${token} (${hex(colour)})`)
    expect(outside, `${name} tokens outside sRGB`).toEqual([])
  })

  it.each(RENDERED_PAIRS)(
    'keeps %s on %s above %s, for %s',
    (foreground, background, threshold, _what) => {
      const ratio = contrast(palette[foreground]!, palette[background]!)
      expect(
        ratio,
        `--${foreground} ${hex(palette[foreground]!)} on --${background} ${hex(
          palette[background]!,
        )} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(threshold)
    },
  )

  it('spends its one accent on the hue the brand mark is drawn in', () => {
    // Sampled, not chosen: the whale's body is hue 263 over 44% of the mark, and the
    // plugin tiles on the social card are the same hue. A drift here would put the
    // product's single accent on a colour the brand does not use.
    for (const token of ['primary', 'primary-fg', 'accent', 'accent-fg', 'ring-color']) {
      expect(palette[token]!.h, `--${token} in ${name}`).toBeCloseTo(BRAND_HUE, 0)
    }
    expect(palette['ring-color'], 'the focus ring is the accent').toEqual(palette['primary'])
  })

  it('keeps every neutral at one hue, and keeps them neutral', () => {
    for (const token of ['bg', 'fg', 'card-fg', 'muted', 'muted-fg', 'line', 'line-strong']) {
      const { c, h } = palette[token]!
      expect(h, `--${token} in ${name} should share the neutral hue`).toBeCloseTo(NEUTRAL_HUE, 0)
      // Cool enough to sit under a blue accent, far too weak to read as a colour.
      expect(c, `--${token} in ${name} should stay near-neutral`).toBeLessThan(0.04)
    }
    // `--card` is the one exception: the lightest surface in light mode is plain
    // white, which has no hue to share.
    expect(palette['card']!.c).toBeLessThan(0.04)
  })

  it('separates the three surfaces a page stacks', () => {
    // Background, card and muted must be distinguishable without a border, or a
    // card on the page and a chip on the card both disappear into their ground.
    const [bg, card, muted] = [palette['bg']!.l, palette['card']!.l, palette['muted']!.l]
    expect(Math.abs(card - bg), `${name}: --card against --bg`).toBeGreaterThan(0.012)
    expect(Math.abs(muted - card), `${name}: --muted against --card`).toBeGreaterThan(0.012)
  })
})

describe('the dark palette', () => {
  it('is identical whether it was chosen or inherited from the system', () => {
    // The cascade forces this block to be written twice — an explicit light choice
    // has to beat a dark OS setting, which needs `:not(.light)`, and CSS cannot
    // share a declaration list across a media-query boundary. So the duplication
    // stays and this assertion is what keeps the two halves from drifting.
    expect(darkSystem).toEqual(dark)
  })

  it('sits close to the social card a reader arrives from', () => {
    // `og.png` grounds the brand on oklch(0.148 0.035 242). Landing on a noticeably
    // lighter or flatter page than the share preview promised reads as a different
    // site.
    expect(dark['bg']!.l).toBeGreaterThan(0.13)
    expect(dark['bg']!.l).toBeLessThan(0.18)
    expect(dark['bg']!.c).toBeGreaterThan(0.02)
  })
})

describe('the two themes together', () => {
  it('agree on which hue is the accent and which is neutral', () => {
    expect(light['primary']!.h).toBe(dark['primary']!.h)
    expect(light['bg']!.h).toBe(dark['bg']!.h)
  })

  it('invert lightness, so neither theme is a tinted copy of the other', () => {
    expect(light['bg']!.l).toBeGreaterThan(0.9)
    expect(dark['bg']!.l).toBeLessThan(0.25)
    // The accent has to climb in dark mode: hue 263 at the lightness light mode uses
    // would be near-invisible on a 0.155 ground.
    expect(dark['primary']!.l).toBeGreaterThan(light['primary']!.l)
  })

  it('keeps red for danger in both', () => {
    for (const palette of [light, dark]) {
      expect(palette['destructive']!.h).toBeGreaterThan(15)
      expect(palette['destructive']!.h).toBeLessThan(45)
    }
  })
})
