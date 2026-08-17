import { describe, expect, it } from 'vitest'
import {
  githubSource,
  npmSource,
  sourceAssetBase,
  sourceDocBase,
  submissionSource,
} from './source-ref.js'

/**
 * These bases are what a readme's relative paths resolve against, so a missing
 * trailing slash or a `blob` where `raw` belongs is the difference between a
 * rendered screenshot and a broken image on every GitHub-sourced plugin page.
 */
describe('readme bases', () => {
  it('points documents at a browsable page and assets at raw bytes', () => {
    const source = githubSource({ owner: 'acme', repo: 'thing' })

    expect(sourceDocBase(source)).toBe('https://github.com/acme/thing/blob/HEAD/')
    expect(sourceAssetBase(source)).toBe('https://github.com/acme/thing/raw/HEAD/')
  })

  it('resolves against the pinned commit and the artifact subdirectory', () => {
    const source = githubSource({
      owner: 'acme',
      repo: 'thing',
      path: 'packages/tool',
      commit: 'abc1234',
    })

    expect(sourceDocBase(source)).toBe(
      'https://github.com/acme/thing/blob/abc1234/packages/tool/',
    )
    expect(new URL('docs/a.md', sourceDocBase(source)).toString()).toBe(
      'https://github.com/acme/thing/blob/abc1234/packages/tool/docs/a.md',
    )
  })

  it('has no base for a source whose readme root is unknowable', () => {
    // A packument readme was written against a repository this row never saw.
    expect(sourceDocBase(npmSource('thing', '1.0.0'))).toBeUndefined()
    expect(sourceAssetBase(npmSource('thing', '1.0.0'))).toBeUndefined()
    expect(sourceDocBase(submissionSource('https://example.com/x'))).toBeUndefined()
  })
})
