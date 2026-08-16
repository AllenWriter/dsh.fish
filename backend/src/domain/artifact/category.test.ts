import { describe, expect, it } from 'vitest'
import { FALLBACK_CATEGORY, knownCategories, normalizeCategories } from './category.js'

/**
 * Category lists arrive from third-party manifests, so this is a boundary, not
 * an internal call: whatever an author wrote in `dsh.hub.categories` reaches
 * here verbatim. The rule under test is that none of it can cost the catalog a
 * row — an artifact is what the harness would load, and a category name is
 * advisory metadata about it.
 */
describe('knownCategories', () => {
  it('keeps the taxonomy entries an author named', () => {
    expect(knownCategories(['coding', 'testing'])).toEqual(['coding', 'testing'])
  })

  it('accepts the shapes people actually write', () => {
    expect(knownCategories(['DevOps', ' security ', 'user_interface'])).toEqual([
      'devops',
      'security',
    ])
  })

  it('drops a name outside the taxonomy instead of rejecting the list', () => {
    expect(knownCategories(['ai', 'coding'])).toEqual(['coding'])
  })

  it('drops a name that is not even slug-shaped', () => {
    // The pre-existing failure this guards: `slug('AI Coding')` throws, the
    // whole artifact was counted as skipped, and the plugin vanished from the
    // catalog over a typo in an advisory field.
    expect(() => knownCategories(['AI Coding!!'])).not.toThrow()
    expect(knownCategories(['AI Coding!!'])).toEqual([])
  })

  it('collapses duplicates and returns canonical order', () => {
    expect(knownCategories(['testing', 'coding', 'TESTING'])).toEqual(['coding', 'testing'])
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
    expect(normalizeCategories(['data'])).toEqual(['data'])
  })
})
