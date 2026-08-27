import { describe, expect, it } from 'vitest'
import {
  FALLBACK_CATEGORY,
  canonicalCategoryId,
  isCategory,
  knownCategories,
  normalizeCategories,
  retiredCategoryTarget,
} from './category.js'

/**
 * Category lists arrive from third-party manifests, so this is a boundary, not
 * an internal call: whatever an author wrote in `dsh.hub.categories` reaches
 * here verbatim. The rule under test is that none of it can cost the catalog a
 * row — an artifact is what the harness would load, and a category name is
 * advisory metadata about it.
 */
describe('knownCategories', () => {
  it('keeps the taxonomy entries an author named', () => {
    expect(knownCategories(['git', 'security'])).toEqual(['git', 'security'])
  })

  it('accepts the shapes people actually write', () => {
    expect(knownCategories(['Git', ' security ', 'user_interface'])).toEqual(['git', 'security'])
  })

  it('maps aliases from other catalogs onto canonical ids', () => {
    expect(knownCategories(['webui', 'channel', 'coding'])).toEqual(['ui', 'git', 'notify'])
  })

  it('drops a name outside the taxonomy instead of rejecting the list', () => {
    expect(knownCategories(['ai', 'git'])).toEqual(['git'])
  })

  it('drops a name that is not even slug-shaped', () => {
    // The pre-existing failure this guards: `slug('AI Coding')` throws, the
    // whole artifact was counted as skipped, and the plugin vanished from the
    // catalog over a typo in an advisory field.
    expect(() => knownCategories(['AI Coding!!'])).not.toThrow()
    expect(knownCategories(['AI Coding!!'])).toEqual([])
  })

  it('collapses duplicates and returns canonical order', () => {
    expect(knownCategories(['git', 'ui', 'GIT', 'coding'])).toEqual(['ui', 'git'])
  })

  it('is empty when nothing was recognised', () => {
    expect(knownCategories([])).toEqual([])
  })
})

describe('normalizeCategories', () => {
  it('falls back rather than leaving a row no filter can reach', () => {
    expect(normalizeCategories([])).toEqual([FALLBACK_CATEGORY])
    expect(normalizeCategories(['not-a-category'])).toEqual([FALLBACK_CATEGORY])
  })

  it('does not add the fallback to a row that is already categorised', () => {
    expect(normalizeCategories(['docs'])).toEqual(['docs'])
  })
})

describe('canonicalCategoryId', () => {
  it('returns a browse id unchanged', () => {
    expect(canonicalCategoryId('ui')).toBe('ui')
  })

  it('resolves a published alias', () => {
    expect(canonicalCategoryId('coding')).toBe('git')
    expect(canonicalCategoryId('models')).toBe('model')
  })

  it('is undefined for a name the taxonomy does not have', () => {
    expect(canonicalCategoryId('agi')).toBeUndefined()
    expect(canonicalCategoryId('not-a-category')).toBeUndefined()
  })
})

describe('isCategory', () => {
  it('is true only for a canonical browse id', () => {
    expect(isCategory('git')).toBe(true)
    expect(isCategory('coding')).toBe(false)
    expect(isCategory('nope')).toBe(false)
  })
})

describe('retiredCategoryTarget', () => {
  it('leaves a canonical id in place', () => {
    expect(retiredCategoryTarget('ui')).toBeUndefined()
    expect(retiredCategoryTarget('other')).toBeUndefined()
  })

  it('names the canonical slug a retired hub id should 301 onto', () => {
    expect(retiredCategoryTarget('coding')).toBe('git')
    expect(retiredCategoryTarget('data')).toBe('docs')
    expect(retiredCategoryTarget('communication')).toBe('notify')
  })
})
