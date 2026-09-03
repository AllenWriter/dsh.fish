import { describe, expect, it } from 'vitest'
import { tocFromDocsMarkdown } from './toc'

describe('tocFromDocsMarkdown', () => {
  it('builds matching ids, preserves heading depth, and skips code fences', () => {
    const markdown = `---\ntitle: Test\n---\n\n# Overview\n\n## Two rules\n\n\`\`\`md\n## hidden\n\`\`\`\n\n### Nested\n\n## Two rules\n`
    expect(tocFromDocsMarkdown(markdown)).toEqual([
      { title: 'Overview', url: '#overview', depth: 1 },
      { title: 'Two rules', url: '#two-rules', depth: 2 },
      { title: 'Nested', url: '#nested', depth: 3 },
      { title: 'Two rules', url: '#two-rules-1', depth: 2 },
    ])
  })
})
