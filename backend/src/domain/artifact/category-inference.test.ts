import { describe, expect, it } from 'vitest'
import { inferCategories, resolveCategories } from './category-inference.js'
import { FALLBACK_CATEGORY } from './category.js'

describe('inferCategories', () => {
  it('reads a category out of repository topics', () => {
    expect(inferCategories({ keywords: ['postgres', 'sql'] })).toEqual(['data'])
  })

  it('reads one out of a description when there are no useful topics', () => {
    expect(
      inferCategories({ text: 'Run the test suite and report coverage back to the agent.' }),
    ).toEqual(['testing'])
  })

  it('lets a deliberate keyword outweigh incidental prose', () => {
    // "code" appears in the sentence, but the author labelled the repository
    // `kubernetes` — the label is the stronger statement of what it is for.
    expect(
      inferCategories({
        keywords: ['kubernetes'],
        text: 'Write code that talks to a cluster.',
      })[0],
    ).toBe('devops')
  })

  it('returns every category a row genuinely spans, most-supported first', () => {
    expect(
      inferCategories({
        keywords: ['postgres', 'postgres'],
        text: 'Schema diffs for code review.',
      }),
    ).toEqual(['data', 'coding'])
  })

  it('caps how many categories one row can claim', () => {
    expect(
      inferCategories({
        keywords: ['docker', 'postgres', 'slack', 'figma', 'pytest', 'react'],
      }).length,
    ).toBeLessThanOrEqual(3)
  })

  it('ignores the words every row in this catalog carries', () => {
    // Every repository under the topic says these; a table that scored them
    // would file the whole catalog into one category.
    expect(inferCategories({ keywords: ['dsh-plugin', 'deepseek', 'agent', 'mcp'] })).toEqual([])
  })

  it('yields nothing rather than guessing', () => {
    expect(inferCategories({ text: 'A thing that does something.' })).toEqual([])
  })

  it('splits hyphenated keywords so a compound label still lands', () => {
    expect(inferCategories({ keywords: ['code-review'] })).toEqual(['coding'])
  })

  it('normalizes full-width Unicode before classification', () => {
    expect(inferCategories({ keywords: ['ＰＯＳＴＧＲＥＳ'] })).toEqual(['data'])
  })
})

describe('resolveCategories', () => {
  it('takes the author at their word when they declared something valid', () => {
    // The description says devops; the author says productivity. They know
    // what they built.
    expect(
      resolveCategories(['productivity'], { keywords: ['docker'], text: 'deploy to kubernetes' }),
    ).toEqual(['productivity'])
  })

  it('infers when the declaration names nothing in the taxonomy', () => {
    expect(resolveCategories(['ai-tooling'], { keywords: ['playwright'] })).toEqual(['testing'])
  })

  it('infers when nothing was declared at all', () => {
    expect(resolveCategories([], { keywords: ['slack'] })).toEqual(['communication'])
  })

  it('falls back when neither the author nor the text says anything', () => {
    expect(resolveCategories([], {})).toEqual([FALLBACK_CATEGORY])
  })
})
