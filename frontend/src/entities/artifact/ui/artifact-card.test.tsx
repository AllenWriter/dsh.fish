import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { LocaleProvider } from '@/shared/config/i18n'
import { ArtifactCard } from './artifact-card'
import type { Artifact } from '../model/types'

const base: Artifact = {
  id: 'dsh-hello',
  kind: 'bundle',
  displayName: '@acme/dsh-hello',
  summary: 'A bundle.',
  keywords: [],
  categories: ['other'],
  sourceOrigin: 'github',
  sourceUrl: 'https://github.com/acme/dsh-hello',
  author: { name: 'acme' },
  verified: false,
  deprecated: false,
  stats: { stars: 1200, downloads: 0, installs: 0 },
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function render(artifact: Artifact) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <LocaleProvider locale="en">
        <ArtifactCard artifact={artifact} />
      </LocaleProvider>
    </MemoryRouter>,
  )
}

describe('ArtifactCard social preview', () => {
  it('paints the GitHub Social preview as a decorative backdrop', () => {
    const html = render({
      ...base,
      ogImageUrl: 'https://opengraph.githubassets.com/preview/acme/dsh-hello',
    })

    expect(html).toContain('class="artifact-og"')
    expect(html).toContain('src="https://opengraph.githubassets.com/preview/acme/dsh-hello"')
    expect(html).toContain('aria-hidden="true"')
    // Decorative: empty alt, the title already names the artifact.
    expect(html).toMatch(/<img[^>]*alt=""/)
  })

  it('does not invent a backdrop when the source has no preview', () => {
    const html = render(base)

    expect(html).not.toContain('artifact-og')
    expect(html).not.toContain('<img')
  })
})
