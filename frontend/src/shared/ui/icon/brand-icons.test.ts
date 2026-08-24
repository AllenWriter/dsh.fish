import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MarkGithubIcon } from '@primer/octicons-react'
import { siDiscord } from 'simple-icons'
import { ICON_WEIGHT, IconDefaults } from './icon'
import { DiscordIcon, GITHUB_MARK_16, GithubIcon } from './brand-icons'

function officialGithubPath(): string {
  const html = renderToStaticMarkup(createElement(MarkGithubIcon, { size: 16 }))
  const match = /d="([^"]+)"/.exec(html)
  if (match?.[1] === undefined) {
    throw new Error('Primer MarkGithubIcon did not draw a path')
  }
  return match[1]
}

describe('destination brand marks', () => {
  it('draws GitHub as Primer Octicons Invertocat, not Phosphor’s cat', () => {
    expect(GITHUB_MARK_16).toBe(officialGithubPath())
    const html = renderToStaticMarkup(
      createElement(IconDefaults, null, createElement(GithubIcon)),
    )
    expect(html).toContain(GITHUB_MARK_16)
    expect(html).toContain('viewBox="0 0 256 256"')
  })

  it('draws Discord as Simple Icons Clyde', () => {
    const html = renderToStaticMarkup(
      createElement(IconDefaults, null, createElement(DiscordIcon)),
    )
    expect(html).toContain(siDiscord.path)
    expect(html).toContain('viewBox="0 0 256 256"')
  })

  it('ignores weight, because a trademarked mark has one silhouette', () => {
    for (const Glyph of [GithubIcon, DiscordIcon]) {
      const drawings = Object.values(ICON_WEIGHT).map((weight) =>
        renderToStaticMarkup(
          createElement(IconDefaults, null, createElement(Glyph, { weight })),
        ),
      )
      expect(new Set(drawings).size).toBe(1)
    }
  })
})
