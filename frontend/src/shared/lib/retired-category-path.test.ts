import { describe, expect, it } from 'vitest'
import { retiredCategoryRedirect } from './retired-category-path'

describe('retiredCategoryRedirect', () => {
  it('folds a retired hub id onto its live slug', () => {
    expect(retiredCategoryRedirect('/category/coding')).toBe('/category/git')
    expect(retiredCategoryRedirect('/category/models')).toBe('/category/model')
    expect(retiredCategoryRedirect('/category/communication')).toBe('/category/notify')
    expect(retiredCategoryRedirect('/category/data')).toBe('/category/docs')
  })

  it('keeps a locale prefix, a markdown alias and the query', () => {
    expect(retiredCategoryRedirect('/ja/category/coding')).toBe('/ja/category/git')
    expect(retiredCategoryRedirect('/category/coding.md')).toBe('/category/git.md')
    expect(retiredCategoryRedirect('/zh-CN/category/coding', '?offset=20')).toBe(
      '/zh-CN/category/git?offset=20',
    )
  })

  it('leaves a canonical id and an unknown id alone', () => {
    expect(retiredCategoryRedirect('/category/git')).toBeUndefined()
    expect(retiredCategoryRedirect('/category/other')).toBeUndefined()
    expect(retiredCategoryRedirect('/category/nope')).toBeUndefined()
    expect(retiredCategoryRedirect('/browse')).toBeUndefined()
  })
})
