import { describe, expect, it } from 'vitest'
import {
  githubRepoFromUrl,
  githubSource,
  mergeProvenance,
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

describe('githubRepoFromUrl', () => {
  it('reads the shapes npm and git actually write', () => {
    expect(githubRepoFromUrl('git+https://github.com/NanmiCoder/dsh-plugin-market.git')).toEqual({
      owner: 'NanmiCoder',
      repo: 'dsh-plugin-market',
    })
    expect(githubRepoFromUrl('git@github.com:acme/plugin.git')).toEqual({
      owner: 'acme',
      repo: 'plugin',
    })
    expect(githubRepoFromUrl('github:acme/plugin')).toEqual({ owner: 'acme', repo: 'plugin' })
  })

  it('ignores a remote that is not GitHub', () => {
    expect(githubRepoFromUrl('https://gitlab.com/acme/plugin.git')).toBeUndefined()
    expect(githubRepoFromUrl('not a url')).toBeUndefined()
  })
})

describe('mergeProvenance', () => {
  it('keeps the list that surfaced a repository when a later crawl refreshes it', () => {
    const listed = githubSource({ owner: 'acme', repo: 'thing', via: ['awesome-dsh-plugin'] })
    const crawled = githubSource({ owner: 'acme', repo: 'thing', commit: 'abc1234' })

    expect(mergeProvenance(listed, crawled)).toEqual({
      origin: 'github',
      owner: 'acme',
      repo: 'thing',
      commit: 'abc1234',
      via: ['awesome-dsh-plugin'],
    })
  })

  it('accumulates every list that surfaced the repository, once each', () => {
    const first = githubSource({ owner: 'acme', repo: 'thing', via: ['awesome-dsh-plugin'] })
    const second = githubSource({
      owner: 'acme',
      repo: 'thing',
      via: ['oh-my-dsh', 'awesome-dsh-plugin'],
    })

    const merged = mergeProvenance(first, second)
    expect(merged.origin === 'github' && merged.via).toEqual([
      'awesome-dsh-plugin',
      'oh-my-dsh',
    ])
  })

  it('passes non-GitHub sources through untouched', () => {
    const npm = npmSource('thing', '1.0.0')
    expect(mergeProvenance(npm, npmSource('thing', '1.1.0'))).toEqual({
      origin: 'npm',
      packageName: 'thing',
      latestVersion: '1.1.0',
    })
  })
})
