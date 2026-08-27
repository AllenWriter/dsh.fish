import { describe, expect, it } from 'vitest'
import { retiredKindRedirect, retiredPublishDocsRedirect } from './retired-kind-path'

describe('retiredKindRedirect', () => {
  it('folds retired kinds onto browse', () => {
    expect(retiredKindRedirect('/kind/mcp-server')).toBe('/browse')
    expect(retiredKindRedirect('/kind/hook-bridge')).toBe('/browse')
  })

  it('keeps a locale prefix, a markdown alias and the query', () => {
    expect(retiredKindRedirect('/ja/kind/mcp-server')).toBe('/ja/browse')
    expect(retiredKindRedirect('/kind/hook-bridge.md')).toBe('/browse.md')
    expect(retiredKindRedirect('/zh-CN/kind/mcp-server', '?sort=name')).toBe(
      '/zh-CN/browse?sort=name',
    )
  })

  it('leaves a live kind and an unknown id alone', () => {
    expect(retiredKindRedirect('/kind/bundle')).toBeUndefined()
    expect(retiredKindRedirect('/kind/nope')).toBeUndefined()
    expect(retiredKindRedirect('/browse')).toBeUndefined()
  })
})

describe('retiredPublishDocsRedirect', () => {
  it('folds retired publish guides onto the plugins overview', () => {
    expect(retiredPublishDocsRedirect('/docs/publish/mcp-server')).toBe('/docs/plugins')
    expect(retiredPublishDocsRedirect('/docs/publish/hook-bridge.md')).toBe('/docs/plugins.md')
    expect(retiredPublishDocsRedirect('/ja/docs/publish/hook-bridge')).toBe('/ja/docs/plugins')
  })

  it('leaves a live publish guide alone', () => {
    expect(retiredPublishDocsRedirect('/docs/publish/bundle')).toBeUndefined()
  })
})
