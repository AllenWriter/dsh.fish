import { DomainError } from '../shared/error.js'
import type { Slug } from '../shared/slug.js'
import { slug } from '../shared/slug.js'

/**
 * A browsable grouping, orthogonal to `ArtifactKind`.
 *
 * Kind answers "how does this install"; category answers "what is it for".
 * A row carries one or more categories, so `coding` can hold bundles, skills
 * and MCP servers alike.
 */
export interface Category {
  readonly id: Slug
  /** i18n key for the display name. The catalog stores no user-facing prose. */
  readonly labelKey: string
  readonly order: number
}

export const CATEGORIES: readonly Category[] = Object.freeze(
  [
    'coding',
    'research',
    'data',
    'devops',
    'productivity',
    'communication',
    'design',
    'security',
    'testing',
    'models',
    'ui',
    'other',
  ].map((id, index) => ({
    id: slug(id),
    labelKey: `category.${id}`,
    order: index,
  })),
)

const BY_ID = new Map(CATEGORIES.map((entry) => [entry.id as string, entry]))

export function category(raw: string): Category {
  const found = BY_ID.get(slug(raw))
  if (!found) {
    throw DomainError.invalid('Unknown category.', { raw })
  }
  return found
}

export function isCategory(raw: string): boolean {
  return BY_ID.has(raw.trim().toLowerCase())
}

/** Where a row lands when nothing more specific is known about it. */
export const FALLBACK_CATEGORY: Slug = slug('other')

/**
 * Reduce an advisory list to the categories this catalog actually browses.
 *
 * Category lists reach the catalog from `dsh.hub.categories` in a third party's
 * manifest, so they carry whatever that author wrote: a name outside the
 * taxonomy, a different case, spaces. None of that is a reason to reject the
 * artifact — the taxonomy is the hub's, not the author's, and the manifest
 * block is explicitly advisory — so an entry that names no known category is
 * dropped and the rest are kept, in canonical order and without duplicates.
 */
export function knownCategories(raw: readonly string[]): readonly Slug[] {
  const named = new Set<string>()
  for (const entry of raw) {
    const id = entry.trim().toLowerCase().replace(/[\s_]+/g, '-')
    if (BY_ID.has(id)) named.add(id)
  }
  return CATEGORIES.filter((entry) => named.has(entry.id)).map((entry) => entry.id)
}

/**
 * As `knownCategories`, but never empty.
 *
 * An uncategorised row is invisible to every category filter on the browse
 * page, which is indistinguishable from not being in the catalog at all.
 */
export function normalizeCategories(raw: readonly string[]): readonly Slug[] {
  const known = knownCategories(raw)
  return known.length > 0 ? known : [FALLBACK_CATEGORY]
}
