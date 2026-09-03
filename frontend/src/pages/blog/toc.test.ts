import { describe, expect, it } from 'vitest'
import { tocFromMarkdown } from './toc'

describe('tocFromMarkdown', () => {
  it('builds GitHub-style ids from ATX headings and skips fences', () => {
    const markdown = `---
title: Test
---

## 一个根目录已经太多

Intro.

\`\`\`
## not a heading
\`\`\`

## Two rules

### Nested

## Two rules
`
    expect(tocFromMarkdown(markdown)).toEqual([
      { title: '一个根目录已经太多', url: '#一个根目录已经太多', depth: 2 },
      { title: 'Two rules', url: '#two-rules', depth: 2 },
      { title: 'Nested', url: '#nested', depth: 3 },
      { title: 'Two rules', url: '#two-rules-1', depth: 2 },
    ])
  })
})
