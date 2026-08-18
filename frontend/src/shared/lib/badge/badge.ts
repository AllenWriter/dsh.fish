import type { QualityGrade } from '@dsh-fish/backend/domain/artifact/quality-score.js'
import { DEFAULT_LOCALE, translate } from '@/shared/config/i18n'
import { compactNumber } from '@/shared/lib/format'

/**
 * Embeddable shields-style badges.
 *
 * A badge is a tiny SVG a plugin author pastes into a README; GitHub's camo
 * proxy and every Markdown renderer rasterise it as-is, so the markup below
 * follows the shields.io flat template byte for byte in spirit — same 20px
 * height, same 3px radius, same Verdana stack — because that rendering is the
 * one README readers everywhere already trust.
 *
 * The strings a badge can show are English regardless of the reader: the SVG
 * is generated once per artifact and embedded in documents in every language.
 * They still come from the message catalogs, not from literals here.
 */

/**
 * Solid grade colours for raster and SVG contexts.
 *
 * `GRADE_BADGE` in `entities/artifact/model/types.ts` is the same mapping
 * expressed in Tailwind utilities for the HTML UI; these hexes are its hues at
 * the -600 step, the lightness a white badge label stays readable on. Keep the
 * two in step: S amber, A emerald, B sky, C grey.
 */
export const GRADE_HEX: Readonly<Record<QualityGrade, string>> = {
  S: '#d97706',
  A: '#059669',
  B: '#0284c7',
  C: '#6b7280',
}

/** What the value half of a badge reports. */
export const BADGE_METRICS = ['grade', 'stars'] as const
export type BadgeMetric = (typeof BADGE_METRICS)[number]

/** The badge's own URL, as linked from READMEs and the artifact page. */
export function badgePath(artifactId: string, metric?: BadgeMetric): string {
  const path = `/a/${artifactId}/badge.svg`
  return metric === undefined || metric === 'grade' ? path : `${path}?metric=${metric}`
}

/**
 * The badge for one artifact.
 *
 * Default form: `dsh.fish | A · 78`, coloured by grade. The stars variant
 * keeps the same label and reports the star count instead, for authors who
 * would rather show adoption than a judgement.
 */
export function artifactBadgeSvg(
  artifact: { grade: QualityGrade; score: number; stats: { stars: number } },
  metric: BadgeMetric,
): string {
  const label = translate(DEFAULT_LOCALE, 'app.name')
  if (metric === 'stars') {
    const value = `★ ${compactNumber(artifact.stats.stars)}`
    return shieldsSvg({ label, value, color: '#0969da', title: `${label}: ${value}` })
  }
  const value = `${artifact.grade} · ${artifact.score}`
  return shieldsSvg({ label, value, color: GRADE_HEX[artifact.grade], title: `${label}: ${value}` })
}

/**
 * One shields flat badge.
 *
 * Widths are measured, not fixed: Verdana at 11px, which is what shields uses
 * and what every README renderer falls back to. The measurement only has to
 * cover the characters a badge can contain — the brand name, a grade letter,
 * digits and the compact-count suffixes — so a per-character table beats
 * shipping a font metrics parser.
 */
export function shieldsSvg({
  label,
  value,
  color,
  title,
}: {
  label: string
  value: string
  color: string
  title: string
}): string {
  const labelWidth = textWidth(label) + 10
  const valueWidth = textWidth(value) + 10
  const width = labelWidth + valueWidth

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${xml(title)}">`,
    `<title>${xml(title)}</title>`,
    `<linearGradient id="s" x2="0" y2="100%">`,
    `<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>`,
    `<stop offset="1" stop-opacity=".1"/>`,
    `</linearGradient>`,
    `<clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>`,
    `<g clip-path="url(#r)">`,
    `<rect width="${labelWidth}" height="20" fill="#555"/>`,
    `<rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>`,
    `<rect width="${width}" height="20" fill="url(#s)"/>`,
    `</g>`,
    `<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">`,
    badgeText(label, labelWidth / 2),
    badgeText(value, labelWidth + valueWidth / 2),
    `</g>`,
    `</svg>`,
  ].join('')
}

/** One label, with the 1px shadow copy that gives shields text its crispness. */
function badgeText(text: string, center: number): string {
  const escaped = xml(text)
  return [
    `<text aria-hidden="true" x="${center * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${textWidth(text) * 10}">${escaped}</text>`,
    `<text x="${center * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${textWidth(text) * 10}">${escaped}</text>`,
  ].join('')
}

/**
 * Advance widths of 11px Verdana for the characters a badge can contain.
 *
 * Derived from the Verdana metrics shields itself ships, scaled ×1.1 from
 * their 10px table. Anything unlisted is charged the average lowercase width.
 */
const CHAR_WIDTHS: Readonly<Record<string, number>> = {
  ' ': 3.9,
  '.': 3.9,
  '·': 3.9,
  '★': 11.4,
  f: 4.2,
  i: 4.0,
  s: 6.0,
  d: 7.3,
  h: 7.3,
  k: 6.7,
  M: 9.9,
  S: 7.6,
  A: 7.9,
  B: 7.4,
  C: 7.7,
  '0': 7.0,
  '1': 7.0,
  '2': 7.0,
  '3': 7.0,
  '4': 7.0,
  '5': 7.0,
  '6': 7.0,
  '7': 7.0,
  '8': 7.0,
  '9': 7.0,
}

const DEFAULT_CHAR_WIDTH = 6.5

function textWidth(text: string): number {
  let width = 0
  for (const char of text) width += CHAR_WIDTHS[char] ?? DEFAULT_CHAR_WIDTH
  return Math.round(width)
}

function xml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
