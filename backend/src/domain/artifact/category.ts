import { DomainError } from '../shared/error.js'
import type { Slug } from '../shared/slug.js'
import { slug } from '../shared/slug.js'

/**
 * A browsable grouping, orthogonal to `ArtifactKind`.
 *
 * Kind answers "how does this install"; category answers "what is it for".
 * A row carries zero or more categories, so `coding` can hold bundles, skills
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
