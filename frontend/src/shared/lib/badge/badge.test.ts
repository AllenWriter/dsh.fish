import { describe, expect, it } from 'vitest'
import {
  artifactBadgeSvg,
  BADGE_METRICS,
  badgePath,
  GRADE_HEX,
  shieldsSvg,
} from '@/shared/lib/badge'

const artifact = {
  grade: 'A' as const,
  score: 78,
  stats: { stars: 1290 },
}

describe('badgePath', () => {
  it('keeps the default grade badge at the clean URL', () => {
    expect(badgePath('dsh-postgres-mcp')).toBe('/a/dsh-postgres-mcp/badge.svg')
    expect(badgePath('dsh-postgres-mcp', 'grade')).toBe('/a/dsh-postgres-mcp/badge.svg')
  })

  it('puts the stars variant in the query string', () => {
    expect(badgePath('dsh-postgres-mcp', 'stars')).toBe('/a/dsh-postgres-mcp/badge.svg?metric=stars')
  })
})

describe('artifactBadgeSvg', () => {
  it('shows the grade and score by default', () => {
    const svg = artifactBadgeSvg(artifact, 'grade')
    expect(svg).toContain('A · 78')
    expect(svg).toContain(`fill="${GRADE_HEX.A}"`)
    expect(svg).toContain('<title>dsh.fish: A · 78</title>')
  })

  it('shows the compact star count for the stars metric', () => {
    const svg = artifactBadgeSvg(artifact, 'stars')
    expect(svg).toContain('★ 1.3k')
    expect(svg).not.toContain('A · 78')
  })

  it('only knows the metrics the route accepts', () => {
    expect(BADGE_METRICS).toEqual(['grade', 'stars'])
  })
})

describe('shieldsSvg', () => {
  it('lays label and value side by side in one 20px badge', () => {
    const svg = shieldsSvg({ label: 'dsh.fish', value: 'A · 78', color: '#059669', title: 't' })
    expect(svg).toContain('height="20"')
    expect(svg).toContain('fill="#555"')
    expect(svg).toContain('fill="#059669"')
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
  })

  it('escapes markup in text and attributes', () => {
    const svg = shieldsSvg({ label: 'a<b', value: '"c"', color: '#000', title: 'x&y' })
    expect(svg).toContain('a&lt;b')
    expect(svg).toContain('&quot;c&quot;')
    expect(svg).toContain('aria-label="x&amp;y"')
    expect(svg).not.toContain('a<b')
  })
})
