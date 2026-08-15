import { DomainError } from './error.js'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$|^[a-z0-9]$/

declare const slugBrand: unique symbol

/**
 * A URL-safe identifier shared by every artifact kind.
 *
 * dsh already constrains several of its own names to this shape — agent preset
 * ids (`[a-z0-9][a-z0-9-]*`) and skill frontmatter names (kebab-case) — so one
 * slug rule covers the catalog without a per-kind dialect.
 */
export type Slug = string & { readonly [slugBrand]: true }

export function slug(raw: string): Slug {
  const value = raw.trim().toLowerCase()
  if (!SLUG_PATTERN.test(value)) {
    throw DomainError.invalid(
      'A slug must be lowercase kebab-case, 1-100 characters, and may not start or end with a hyphen.',
      { raw },
    )
  }
  return value as Slug
}

export function isSlug(raw: string): boolean {
  return SLUG_PATTERN.test(raw.trim().toLowerCase())
}

/** Derive a slug from free text, e.g. an npm package name or a repository name. */
export function slugify(raw: string): Slug {
  const value = raw
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '')
  return slug(value)
}
