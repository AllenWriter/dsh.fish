import { describe, expect, it } from 'vitest'
import type { ArtifactReviews } from './hub-client.js'
import { renderArtifactReviews } from './review-text.js'

function reviews(overrides: Partial<ArtifactReviews> = {}): ArtifactReviews {
  return {
    artifactId: 'dsh-postgres-mcp',
    scale: { min: 1, max: 5 },
    summary: { average: 4.3, count: 4, distribution: [0, 1, 0, 2, 1] },
    items: [
      {
        author: { name: 'Ada' },
        rating: 5,
        comment: 'Solid.',
        createdAt: '2025-08-01T00:00:00.000Z',
        updatedAt: '2025-08-01T00:00:00.000Z',
      },
      {
        author: { name: 'Grace' },
        rating: 4,
        createdAt: '2025-07-01T00:00:00.000Z',
        updatedAt: '2025-07-01T00:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

describe('renderArtifactReviews', () => {
  it('says so when nobody has rated', () => {
    const text = renderArtifactReviews(
      reviews({ summary: { average: null, count: 0, distribution: [0, 0, 0, 0, 0] }, items: [] }),
    )
    expect(text).toBe('No ratings yet for dsh-postgres-mcp.')
  })

  it('renders the average, one bar per star value, and only actual comments', () => {
    const text = renderArtifactReviews(reviews())
    const lines = text.split('\n')

    expect(lines[0]).toBe('4.3 / 5 from 4 rating(s):')
    // Bars are 20 cells wide and sized by share of all ratings.
    expect(lines[1]).toMatch(/^5 ★ [█·]{20} 1$/)
    expect(lines[2]).toMatch(/^4 ★ [█·]{20} 2$/)
    expect(lines[3]).toMatch(/^3 ★ [█·]{20} 0$/)
    // The rating-only entry is aggregated above; it is not a comment.
    expect(text).toContain('Ada — 5 ★')
    expect(text).toContain('    Solid.')
    expect(text).not.toContain('Grace — 4 ★')
  })

  it('keeps every bar cell filled when one rating value takes all', () => {
    const text = renderArtifactReviews(
      reviews({ summary: { average: 5, count: 2, distribution: [0, 0, 0, 0, 2] } }),
    )
    expect(text).toContain(`5 ★ ${'█'.repeat(20)} 2`)
  })
})
