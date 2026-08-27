import { describe, expect, it } from 'vitest'
import { inferCategories, resolveCategories } from './category-inference.js'
import { FALLBACK_CATEGORY } from './category.js'

describe('inferCategories', () => {
  it('reads a category out of repository topics', () => {
    expect(inferCategories({ keywords: ['postgres', 'sql'] })).toEqual(['docs'])
  })

  it('reads one out of a description when there are no useful topics', () => {
    expect(
      inferCategories({ text: 'A browser that scrapes pages for the agent.' }),
    ).toEqual(['browser'])
  })

  it('lets a deliberate keyword outweigh incidental prose', () => {
    // "git" appears in the sentence, but the author labelled the repository
    // `docker` — the label is the stronger statement of what it is for.
    expect(
      inferCategories({
        keywords: ['docker'],
        text: 'Write git hooks that talk to a cluster.',
      })[0],
    ).toBe('dev')
  })

  it('returns every category a row genuinely spans, most-supported first', () => {
    expect(
      inferCategories({
        keywords: ['postgres', 'postgres'],
        text: 'Schema diffs for code review.',
      }),
    ).toEqual(['docs', 'git'])
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

  it('does not file the whole catalog under models for saying llm', () => {
    expect(inferCategories({ text: 'An llm plugin for the harness.' })).toEqual([])
  })

  it('yields nothing rather than guessing', () => {
    expect(inferCategories({ text: 'A thing that does something.' })).toEqual([])
  })

  it('splits hyphenated keywords so a compound label still lands', () => {
    expect(inferCategories({ keywords: ['code-review'] })).toEqual(['git'])
  })

  it('normalizes full-width Unicode before classification', () => {
    expect(inferCategories({ keywords: ['ＰＯＳＴＧＲＥＳ'] })).toEqual(['docs'])
  })
})

describe('resolveCategories', () => {
  it('takes the author at their word when they declared something valid', () => {
    // The description says devops; the author says workflow. They know
    // what they built.
    expect(
      resolveCategories(['workflow'], { keywords: ['docker'], text: 'deploy to kubernetes' }),
    ).toEqual(['workflow'])
  })

  it('accepts an alias the author copied from another catalog', () => {
    expect(resolveCategories(['webui'], { keywords: ['docker'] })).toEqual(['ui'])
  })

  it('lets a curated-list label fill in when the author declared nothing', () => {
    expect(resolveCategories([], { keywords: ['docker'] }, ['memory'])).toEqual(['memory'])
  })

  it('does not let a curated label override a real declaration', () => {
    expect(resolveCategories(['git'], { keywords: ['docker'] }, ['memory'])).toEqual(['git'])
  })

  it('infers when the declaration names nothing in the taxonomy', () => {
    expect(resolveCategories(['ai-tooling'], { keywords: ['playwright'] })).toEqual(['browser'])
  })

  it('infers when nothing was declared at all', () => {
    expect(resolveCategories([], { keywords: ['slack'] })).toEqual(['notify'])
  })

  it('falls back when neither the author nor the text says anything', () => {
    expect(resolveCategories([], {})).toEqual([FALLBACK_CATEGORY])
  })
})
