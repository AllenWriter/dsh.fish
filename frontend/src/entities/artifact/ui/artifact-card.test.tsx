import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { LocaleProvider } from '@/shared/config/i18n'
import { IconDefaults } from '@/shared/ui/icon'
import { ArtifactCard } from './artifact-card'
import { mockArtifact } from '../model/artifact.fixture'
import type { Artifact } from '../model/types'

const base = mockArtifact()

function render(artifact: Artifact) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <IconDefaults>
        <LocaleProvider locale="en">
          <ArtifactCard artifact={artifact} />
        </LocaleProvider>
      </IconDefaults>
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

describe('ArtifactCard trust signals', () => {
  it('renders the grade badge, the maintenance chip and the weekly velocity', () => {
    const html = render({
      ...base,
      grade: 'S',
      maintenanceStatus: 'slowing',
      starVelocity7d: 12,
    })

    expect(html).toContain('title="Quality grade S"')
    expect(html).toContain('>S</span>')
    expect(html).toContain('Slowing')
    expect(html).toContain('+12 this week')
  })

  it('omits the maintenance chip when the artifact is merely active', () => {
    const html = render({ ...base, maintenanceStatus: 'active' })

    expect(html).not.toContain('maintenanceTitle')
    expect(html).not.toContain('>Active</span>')
  })

  it('hides the velocity when the artifact has not gained stars', () => {
    const html = render({ ...base, starVelocity7d: 0 })

    expect(html).not.toContain('this week')
    expect(html).not.toContain('this month')
  })
})
