import { DomainError } from '../shared/error.js'
import type { Slug } from '../shared/slug.js'
import { slug } from '../shared/slug.js'

/**
 * A browsable grouping, orthogonal to `ArtifactKind`.
 *
 * Kind answers "how does this install"; category answers "what is it for".
 * The ids follow the awesome-dsh-plugin.com registry (the vocabulary authors
 * already pick when they submit there), plus `other` as the floor so a row
 * no filter can reach is never stored.
 */
export interface Category {
  readonly id: Slug
  /** i18n key for the display name. The catalog stores no user-facing prose. */
  readonly labelKey: string
  readonly order: number
}

/**
 * Canonical browse ids, in display order.
 *
 * `agi` exists in awesome-dsh-plugin's source `CAT_IDS` but not in the live
 * plugins.json — an empty bucket is omitted. `skill` here is a purpose
 * ("skills packs and pickers"), not `ArtifactKind.skill`.
 */
export const CATEGORY_IDS = [
  'ui',
  'usage',
  'theme',
  'model',
  'identity',
  'session',
  'memory',
  'tools',
  'browser',
  'vision',
  'voice',
  'docs',
  'skill',
  'workflow',
  'git',
  'notify',
  'dev',
  'security',
  'remote',
  'market',
  'fun',
  'other',
] as const

export const CATEGORIES: readonly Category[] = Object.freeze(
  CATEGORY_IDS.map((id, index) => ({
    id: slug(id),
    labelKey: `category.${id}`,
    order: index,
  })),
)

/**
 * Names other catalogs — and this hub's previous taxonomy — write, mapped
 * onto the ids we actually browse.
 *
 * Oh-My-DSH and `dsh.hub.categories` are advisory; an alias is accepted the
 * same way a canonical id is, then stored in canonical form.
 */
export const CATEGORY_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  channel: 'notify',
  webui: 'ui',
  skin: 'theme',
  agent: 'tools',
  code: 'git',
  devtools: 'dev',
  collection: 'market',
  eco: 'market',
  data: 'docs',
  coding: 'git',
  research: 'docs',
  devops: 'dev',
  productivity: 'workflow',
  communication: 'notify',
  design: 'theme',
  testing: 'git',
  models: 'model',
})

const BY_ID = new Map(CATEGORIES.map((entry) => [entry.id as string, entry]))

function normalizeId(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_]+/g, '-')
}

/**
 * The browse id for a string, if it names a category or a published alias.
 */
export function canonicalCategoryId(raw: string): string | undefined {
  const id = normalizeId(raw)
  if (id === '') return undefined
  if (BY_ID.has(id)) return id
  const aliased = CATEGORY_ALIASES[id]
  return aliased !== undefined && BY_ID.has(aliased) ? aliased : undefined
}

export function category(raw: string): Category {
  const id = canonicalCategoryId(raw)
  const found = id === undefined ? undefined : BY_ID.get(id)
  if (!found) {
    throw DomainError.invalid('Unknown category.', { raw })
  }
  return found
}

/** True only for a canonical browse id, not for a retired alias. */
export function isCategory(raw: string): boolean {
  return BY_ID.has(raw.trim().toLowerCase())
}

/**
 * Where a retired hub category URL should 301.
 *
 * Canonical ids return undefined — `/category/ui` stays. An alias that is not
 * itself a browse id (`coding`, `data`, Oh-My-DSH's `webui`) returns the
 * target slug.
 */
export function retiredCategoryTarget(raw: string): string | undefined {
  const id = normalizeId(raw)
  if (BY_ID.has(id)) return undefined
  return canonicalCategoryId(id)
}

/** Where a row lands when nothing more specific is known about it. */
export const FALLBACK_CATEGORY: Slug = slug('other')

/**
 * Reduce an advisory list to the categories this catalog actually browses.
 *
 * Category lists reach the catalog from `dsh.hub.categories` in a third party's
 * manifest, so they carry whatever that author wrote: a name outside the
 * taxonomy, a different case, spaces, or a name from another catalog's
 * vocabulary. None of that is a reason to reject the artifact — the taxonomy
 * is the hub's, not the author's, and the manifest block is explicitly
 * advisory — so an entry that names no known category is dropped and the rest
 * are kept, in canonical order and without duplicates.
 */
export function knownCategories(raw: readonly string[]): readonly Slug[] {
  const named = new Set<string>()
  for (const entry of raw) {
    const id = canonicalCategoryId(entry)
    if (id !== undefined) named.add(id)
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
