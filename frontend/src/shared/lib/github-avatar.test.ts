import { describe, expect, it } from 'vitest'
import { githubAvatarUrl, githubLogin } from './github-avatar'

describe('githubLogin', () => {
  it('reads the single path segment of a GitHub profile', () => {
    expect(githubLogin('https://github.com/titanwings')).toBe('titanwings')
    expect(githubLogin('https://www.github.com/titanwings/')).toBe('titanwings')
  })

  it('rejects a repository URL, which is not a profile', () => {
    expect(githubLogin('https://github.com/titanwings/dot-skill')).toBeUndefined()
  })

  it('rejects anything that is not an https GitHub profile', () => {
    expect(githubLogin(undefined)).toBeUndefined()
    expect(githubLogin('https://gitlab.com/titanwings')).toBeUndefined()
    expect(githubLogin('http://github.com/titanwings')).toBeUndefined()
    expect(githubLogin('not a url')).toBeUndefined()
    expect(githubLogin('https://github.com/')).toBeUndefined()
  })

  it('rejects a segment that could not be a GitHub login', () => {
    expect(githubLogin('https://github.com/has.dot')).toBeUndefined()
    expect(githubLogin('https://github.com/-leading')).toBeUndefined()
  })
})

describe('githubAvatarUrl', () => {
  it("is GitHub's documented portrait for that login", () => {
    expect(githubAvatarUrl('https://github.com/titanwings')).toBe(
      'https://github.com/titanwings.png?size=128',
    )
  })

  it('is absent when the URL is not a GitHub profile', () => {
    expect(githubAvatarUrl('https://github.com/titanwings/dot-skill')).toBeUndefined()
    expect(githubAvatarUrl(undefined)).toBeUndefined()
  })
})
