/**
 * The design tokens, read back out of the stylesheet.
 *
 * `app.css` is the single source of truth — nothing here restates a colour. This
 * module parses it so `palette.test.ts` can hold the authored values to the three
 * things a stylesheet cannot check for itself: that every colour is inside sRGB,
 * that the pairs the UI actually renders meet their contrast threshold, and that
 * the dark block, which the cascade forces to be written twice, says the same thing
 * both times.
 *
 * The colour maths is Oklab's published matrices rather than a dependency: it is
 * forty lines, it is used only by a test, and a colour library in the app bundle to
 * verify constants at build time would be paid for by every reader.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface Oklch {
  readonly l: number
  readonly c: number
  readonly h: number
}

export type Palette = Readonly<Record<string, Oklch>>

const STYLESHEET = resolve(dirname(fileURLToPath(import.meta.url)), 'app.css')

const DECLARATION = /--([a-z-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g

function parse(block: string): Palette {
  const tokens: Record<string, Oklch> = {}
  for (const [, name, l, c, h] of block.matchAll(DECLARATION)) {
    tokens[name!] = { l: Number(l), c: Number(c), h: Number(h) }
  }
  return tokens
}

/**
 * The three token blocks the stylesheet declares.
 *
 * `darkSystem` is the same palette as `dark` under `prefers-color-scheme`, kept
 * separate so a test can prove the two agree. They cannot be one block: an explicit
 * light choice has to win over a dark OS setting, which needs the `:not(.light)`
 * selector, and CSS has no way to share a declaration list across a media-query
 * boundary.
 */
export function readPalettes(): { light: Palette; dark: Palette; darkSystem: Palette } {
  const css = readFileSync(STYLESHEET, 'utf8')
  const lightStart = css.indexOf(':root {')
  const darkStart = css.indexOf(':root.dark {')
  const systemStart = css.indexOf('@media (prefers-color-scheme: dark)')
  const systemEnd = css.indexOf('* {', systemStart)

  return {
    light: parse(css.slice(lightStart, darkStart)),
    dark: parse(css.slice(darkStart, systemStart)),
    darkSystem: parse(css.slice(systemStart, systemEnd)),
  }
}

/** Oklch to linear-light sRGB, which may fall outside the 0–1 the display can show. */
function toLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const radians = (h * Math.PI) / 180
  const a = c * Math.cos(radians)
  const b = c * Math.sin(radians)

  const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ]
}

/**
 * Whether a colour is one the display can actually produce.
 *
 * A chroma outside sRGB is not an error the browser reports — it gamut-maps the
 * value and paints something else, so the colour that ships is not the colour that
 * was authored. The tolerance absorbs floating-point noise at the boundary only.
 */
export function inSrgb(colour: Oklch, tolerance = 0.001): boolean {
  return toLinearSrgb(colour).every(
    (channel) => channel >= -tolerance && channel <= 1 + tolerance,
  )
}

export function hex(colour: Oklch): string {
  const encode = (channel: number) => {
    const clamped = Math.min(Math.max(channel, 0), 1)
    const gamma =
      clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
    return Math.round(Math.min(Math.max(gamma, 0), 1) * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${toLinearSrgb(colour).map(encode).join('')}`
}

/** WCAG 2.1 relative luminance. */
function luminance(colour: Oklch): number {
  const [r, g, b] = toLinearSrgb(colour).map((channel) => Math.min(Math.max(channel, 0), 1))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

/** WCAG 2.1 contrast ratio, from 1 (identical) to 21 (black on white). */
export function contrast(a: Oklch, b: Oklch): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (high + 0.05) / (low + 0.05)
}
