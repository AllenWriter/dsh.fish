import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { LocaleProvider } from '@/shared/config/i18n'
import { mockArtifact } from '@/entities/artifact/model/artifact.fixture'
import { ReadmeBadge } from './readme-badge'

const ORIGIN = 'https://dsh.fish'

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <LocaleProvider locale="en">
        <ReadmeBadge artifact={mockArtifact()} origin={ORIGIN} />
      </LocaleProvider>
    </MemoryRouter>,
  )
}

describe('the README badge panel', () => {
  it('previews the badge the route serves', () => {
    const html = render()
    expect(html).toContain(`<img src="/a/dsh-hello/badge.svg"`)
    expect(html).toContain('alt="@acme/dsh-hello on dsh.fish"')
  })

  it('offers Markdown that links the badge back to the artifact page', () => {
    const html = render()
    expect(html).toContain(
      `[![@acme/dsh-hello on dsh.fish](${ORIGIN}/a/dsh-hello/badge.svg)](${ORIGIN}/a/dsh-hello)`,
    )
  })
})
