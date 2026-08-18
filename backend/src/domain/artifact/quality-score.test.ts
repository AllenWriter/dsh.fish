import { describe, expect, it } from 'vitest'
import type { ScoreInput } from './quality-score.js'
import {
  SCORING_MODEL,
  maintenanceStatus,
  popularityDimension,
  qualityDimension,
  scoreArtifact,
  starVelocity,
} from './quality-score.js'

const NOW = new Date('2026-08-18T00:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS)
}

function input(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    stats: { stars: 0, downloads: 0, installs: 0 },
    verified: false,
    hasReadme: false,
    hasLicense: false,
    hasAuthor: false,
    deprecated: false,
    updatedAt: NOW,
    ...overrides,
  }
}

describe('maintenanceStatus', () => {
  it('bucket boundaries follow the published windows', () => {
    expect(maintenanceStatus(daysAgo(30), NOW)).toBe('active')
    expect(maintenanceStatus(daysAgo(31), NOW)).toBe('slowing')
    expect(maintenanceStatus(daysAgo(90), NOW)).toBe('slowing')
    expect(maintenanceStatus(daysAgo(91), NOW)).toBe('stale')
    expect(maintenanceStatus(daysAgo(365), NOW)).toBe('stale')
    expect(maintenanceStatus(daysAgo(366), NOW)).toBe('abandoned')
  })

  it('treats a deprecated artifact as abandoned however fresh it is', () => {
    expect(maintenanceStatus(NOW, NOW, true)).toBe('abandoned')
  })
})

describe('popularityDimension', () => {
  it('is zero with no signal and saturates at the published raw value', () => {
    expect(popularityDimension({ stars: 0, downloads: 0, installs: 0 })).toBe(0)
    // raw = installs*3 + stars + downloads/10 = 3 * 10_000 / 3… use stars for clarity.
    expect(popularityDimension({ stars: SCORING_MODEL.popularity.saturation, downloads: 0, installs: 0 })).toBe(100)
    expect(
      popularityDimension({ stars: 10 * SCORING_MODEL.popularity.saturation, downloads: 0, installs: 0 }),
    ).toBe(100)
  })

  it('weighs hub installs three stars, as documented', () => {
    const byInstalls = popularityDimension({ stars: 0, downloads: 0, installs: 10 })
    const byStars = popularityDimension({ stars: 30, downloads: 0, installs: 0 })
    expect(byInstalls).toBe(byStars)
  })

  it('grows monotonically on the log scale', () => {
    const points = [10, 100, 1_000].map((stars) =>
      popularityDimension({ stars, downloads: 0, installs: 0 }),
    )
    expect(points[0]).toBeLessThan(points[1]!)
    expect(points[1]).toBeLessThan(points[2]!)
  })
})

describe('qualityDimension', () => {
  it('sums the published points to a maximum of 100', () => {
    expect(
      qualityDimension({ verified: false, hasReadme: false, hasLicense: false, hasAuthor: false }),
    ).toBe(0)
    expect(
      qualityDimension({ verified: true, hasReadme: true, hasLicense: true, hasAuthor: true }),
    ).toBe(100)
    expect(
      qualityDimension({ verified: true, hasReadme: false, hasLicense: false, hasAuthor: false }),
    ).toBe(50)
  })
})

describe('scoreArtifact', () => {
  it('blends the dimensions with the published weights', () => {
    // popularity 0, maintenance 100 (active), quality 0 → 0.3 * 100 = 30.
    const result = scoreArtifact(input(), NOW)
    expect(result.dimensions).toEqual({ popularity: 0, maintenance: 100, quality: 0 })
    expect(result.score).toBe(30)
    expect(result.maintenanceStatus).toBe('active')
  })

  it('grades by the published thresholds', () => {
    const active = (quality: Partial<ScoreInput>) => scoreArtifact(input(quality), NOW)

    // popularity 0, maintenance 100, quality 100 → 30 + 30 = 60… plus 0.4*0 = 60 → B.
    expect(
      active({ verified: true, hasReadme: true, hasLicense: true, hasAuthor: true }).score,
    ).toBe(60)
    expect(
      active({ verified: true, hasReadme: true, hasLicense: true, hasAuthor: true }).grade,
    ).toBe('B')

    // Stale (maintenance 30), quality 100, popularity 0 → 9 + 30 = 39 → C.
    const stale = scoreArtifact(
      input({
        verified: true,
        hasReadme: true,
        hasLicense: true,
        hasAuthor: true,
        updatedAt: daysAgo(100),
      }),
      NOW,
    )
    expect(stale.score).toBe(39)
    expect(stale.grade).toBe('C')
  })

  it('reaches S when every dimension is strong', () => {
    const result = scoreArtifact(
      input({
        stats: { stars: SCORING_MODEL.popularity.saturation, downloads: 0, installs: 0 },
        verified: true,
        hasReadme: true,
        hasLicense: true,
        hasAuthor: true,
      }),
      NOW,
    )
    expect(result.score).toBe(100)
    expect(result.grade).toBe('S')
  })

  it('sinks to C for an abandoned artifact with no other signal', () => {
    const result = scoreArtifact(input({ deprecated: true }), NOW)
    expect(result.maintenanceStatus).toBe('abandoned')
    expect(result.score).toBe(0)
    expect(result.grade).toBe('C')
  })
})

describe('starVelocity', () => {
  it('takes the most recent snapshot at or before the window cutoff', () => {
    const history = [
      { stars: 100, capturedAt: daysAgo(10) },
      { stars: 120, capturedAt: daysAgo(8) },
      { stars: 150, capturedAt: daysAgo(2) }, // inside the 7d window: not an anchor
    ]
    expect(starVelocity(170, history, 7, NOW)).toBe(50)
    // Nothing here is 30 days old yet, so the wider window is still unmeasured.
    expect(starVelocity(170, history, 30, NOW)).toBe(0)
  })

  it('reaches further back for the wider window', () => {
    const history = [
      { stars: 40, capturedAt: daysAgo(35) },
      { stars: 100, capturedAt: daysAgo(10) },
    ]
    expect(starVelocity(170, history, 7, NOW)).toBe(70)
    expect(starVelocity(170, history, 30, NOW)).toBe(130)
  })

  it('is zero when history does not reach back far enough', () => {
    const history = [{ stars: 100, capturedAt: daysAgo(2) }]
    expect(starVelocity(170, history, 7, NOW)).toBe(0)
    expect(starVelocity(170, [], 7, NOW)).toBe(0)
  })

  it('goes negative when a repository loses stars', () => {
    const history = [{ stars: 200, capturedAt: daysAgo(10) }]
    expect(starVelocity(170, history, 7, NOW)).toBe(-30)
  })
})
