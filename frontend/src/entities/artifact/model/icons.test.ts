import { describe, expect, it } from 'vitest'
import { glyphPaths } from '@/shared/ui/icon/icon.fixture'
import { categoryIcon, kindIcon } from './icons'
import { ARTIFACT_KINDS, CATEGORIES } from './types'

const CATEGORY_IDS = CATEGORIES.map((entry) => entry.id as string)

/** A mark's identity, as the drawing rather than as the component reference. */
function mark(...paths: readonly string[]): string {
  return paths.join('|')
}

const KIND_MARKS = ARTIFACT_KINDS.map((kind) => mark(...glyphPaths(kindIcon(kind))))

describe('artifact kind glyphs', () => {
  it('covers every kind the taxonomy defines', () => {
    for (const kind of ARTIFACT_KINDS) {
      expect(glyphPaths(kindIcon(kind)), kind).not.toHaveLength(0)
    }
  })

  it('gives each kind its own mark', () => {
    // Two kinds sharing a glyph would make the chip say less than the word does,
    // which is the whole reason the chip has a glyph.
    expect(new Set(KIND_MARKS).size).toBe(ARTIFACT_KINDS.length)
  })
})

describe('category glyphs', () => {
  it('covers every category the taxonomy browses', () => {
    // The drift guard. A category added to the backend without a mark here shows
    // up as a bare pill in the filter rail, the footer and every plugin page.
    for (const id of CATEGORY_IDS) {
      const glyph = categoryIcon(id)
      expect(glyph, id).toBeDefined()
      expect(glyphPaths(glyph!), id).not.toHaveLength(0)
    }
  })

  it('gives each category its own mark', () => {
    const marks = CATEGORY_IDS.map((id) => mark(...glyphPaths(categoryIcon(id)!)))
    expect(new Set(marks).size).toBe(CATEGORY_IDS.length)
  })

  it('reports an unmapped id as absent rather than substituting a mark', () => {
    // A stand-in would look deliberate and hide the gap the test above catches.
    expect(categoryIcon('not-a-category')).toBeUndefined()
  })
})

describe('the two taxonomies together', () => {
  it('never spends the same mark on a kind and on a category', () => {
    // They sit side by side on a plugin page — kind chip above, category pills
    // below — so one glyph meaning both would be read as one fact.
    const kinds = new Set(KIND_MARKS)
    for (const id of CATEGORY_IDS) {
      expect(kinds.has(mark(...glyphPaths(categoryIcon(id)!))), id).toBe(false)
    }
  })
})
