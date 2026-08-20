import { describe, expect, it } from 'vitest'
import { productDocsMarkdown, supportsProductDocsMarkdown } from './raw'

describe('productDocsMarkdown', () => {
  it('bundles the index and nested publish pages', () => {
    expect(supportsProductDocsMarkdown('/docs')).toBe(true)
    expect(supportsProductDocsMarkdown('/docs/cli')).toBe(true)
    expect(supportsProductDocsMarkdown('/docs/publish/hook-bridge')).toBe(true)
    expect(productDocsMarkdown('/docs/cli')).toContain('npx @dsh-fish/cli')
    expect(productDocsMarkdown('/docs/publish/hook-bridge')).toContain('hook-bridge')
  })

  it('does not treat the search index as a document', () => {
    expect(supportsProductDocsMarkdown('/docs/search')).toBe(false)
    expect(productDocsMarkdown('/browse')).toBeUndefined()
  })
})
