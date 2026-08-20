import { DESCRIPTION_MAX } from '@/shared/config/site'

/**
 * Absolute URL for one unlocalized path.
 *
 * Canonical values must be absolute — a relative `href` is either ignored or
 * resolved against the wrong base — so every SEO tag goes through here rather
 * than interpolating a path into a template. One path is one document in
 * every language: the language is negotiated per request, not carried in the
 * URL.
 */
export function absoluteUrl(origin: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${origin.replace(/\/+$/, '')}${normalized}`
}

/**
 * Trim a description to something an engine will show whole.
 *
 * Cuts on a word boundary and adds an ellipsis, so a clamped summary reads as
 * deliberately shortened rather than as a truncation bug.
 */
export function clampDescription(value: string, max = DESCRIPTION_MAX): string {
  const collapsed = value.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= max) return collapsed
  const cut = collapsed.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:—-]+$/, '')}…`
}
