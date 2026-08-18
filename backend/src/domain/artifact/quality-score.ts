/**
 * The public quality score for a catalog row.
 *
 * Everything in this file is deterministic and reproduced by
 * `GET /api/v1/scoring`, so anyone can recompute what the site shows. The
 * model is three dimensions, each 0–100, blended with fixed weights into a
 * 0–100 score and a letter grade:
 *
 *   score = round(0.4 · popularity + 0.3 · maintenance + 0.3 · quality)
 *
 * - popularity: `installs * 3 + stars + downloads / 10` on a log10 scale that
 *   saturates at a raw value of 10,000. Installs weigh most because they are
 *   the only signal the hub observes itself rather than copies from upstream.
 * - maintenance: how recently the artifact changed, bucketed into a
 *   `MaintenanceStatus`. A deprecated artifact is `abandoned` by definition.
 * - quality: additive points for trust signals — verified ownership, a
 *   readme, a declared license, a named author.
 */

export type MaintenanceStatus = 'active' | 'slowing' | 'stale' | 'abandoned'

export type QualityGrade = 'S' | 'A' | 'B' | 'C'

export interface QualityDimensions {
  readonly popularity: number
  readonly maintenance: number
  readonly quality: number
}

export interface QualityScore {
  readonly score: number
  readonly grade: QualityGrade
  readonly dimensions: QualityDimensions
  readonly maintenanceStatus: MaintenanceStatus
}

export interface ScoreInput {
  readonly stats: {
    readonly stars: number
    readonly downloads: number
    readonly installs: number
  }
  readonly verified: boolean
  readonly hasReadme: boolean
  readonly hasLicense: boolean
  readonly hasAuthor: boolean
  readonly deprecated: boolean
  readonly updatedAt: Date
}

/**
 * The whole model as data. This constant is what `GET /api/v1/scoring`
 * serializes, so the published formula and the executed formula cannot drift.
 */
export const SCORING_MODEL = {
  weights: { popularity: 0.4, maintenance: 0.3, quality: 0.3 },
  popularity: {
    raw: 'installs * 3 + stars + downloads / 10',
    scale: 'round(100 * log10(1 + raw) / log10(1 + saturation))',
    saturation: 10_000,
  },
  maintenance: {
    /** Upper bound in days since `updatedAt` for each status, ascending. */
    windowsDays: { active: 30, slowing: 90, stale: 365 },
    dimensionScores: { active: 100, slowing: 60, stale: 30, abandoned: 0 },
  },
  quality: {
    points: { verified: 50, readme: 25, license: 15, author: 10 },
  },
  /** Minimum score for each grade; anything below `B` is a `C`. */
  grades: { S: 85, A: 70, B: 50 },
} as const

const DAY_MS = 24 * 60 * 60 * 1000

export function maintenanceStatus(
  updatedAt: Date,
  now: Date,
  deprecated = false,
): MaintenanceStatus {
  if (deprecated) return 'abandoned'
  const ageDays = (now.getTime() - updatedAt.getTime()) / DAY_MS
  const { active, slowing, stale } = SCORING_MODEL.maintenance.windowsDays
  if (ageDays <= active) return 'active'
  if (ageDays <= slowing) return 'slowing'
  if (ageDays <= stale) return 'stale'
  return 'abandoned'
}

/** Log-scaled so the long tail of small plugins still ranks by movement. */
export function popularityDimension(stats: ScoreInput['stats']): number {
  const raw = stats.installs * 3 + stats.stars + stats.downloads / 10
  const { saturation } = SCORING_MODEL.popularity
  return Math.min(100, Math.round((100 * Math.log10(1 + raw)) / Math.log10(1 + saturation)))
}

export function qualityDimension(
  input: Pick<ScoreInput, 'verified' | 'hasReadme' | 'hasLicense' | 'hasAuthor'>,
): number {
  const { points } = SCORING_MODEL.quality
  return (
    (input.verified ? points.verified : 0) +
    (input.hasReadme ? points.readme : 0) +
    (input.hasLicense ? points.license : 0) +
    (input.hasAuthor ? points.author : 0)
  )
}

export function scoreArtifact(input: ScoreInput, now: Date): QualityScore {
  const status = maintenanceStatus(input.updatedAt, now, input.deprecated)
  const dimensions: QualityDimensions = {
    popularity: popularityDimension(input.stats),
    maintenance: SCORING_MODEL.maintenance.dimensionScores[status],
    quality: qualityDimension(input),
  }
  const { weights } = SCORING_MODEL
  const score = Math.round(
    weights.popularity * dimensions.popularity +
      weights.maintenance * dimensions.maintenance +
      weights.quality * dimensions.quality,
  )
  return { score, grade: gradeFor(score), dimensions, maintenanceStatus: status }
}

function gradeFor(score: number): QualityGrade {
  const { S, A, B } = SCORING_MODEL.grades
  if (score >= S) return 'S'
  if (score >= A) return 'A'
  if (score >= B) return 'B'
  return 'C'
}

/**
 * One point of metrics history, appended by each ingestion sweep.
 */
export interface MetricsSnapshot {
  readonly stars: number
  readonly capturedAt: Date
}

/**
 * Stars gained over a trailing window: the current count minus the most
 * recent snapshot taken at least `windowDays` ago. Zero when history does not
 * reach back that far — a young artifact is not "rising", it is unmeasured.
 */
export function starVelocity(
  currentStars: number,
  history: readonly MetricsSnapshot[],
  windowDays: number,
  now: Date,
): number {
  const cutoff = now.getTime() - windowDays * DAY_MS
  let anchor: MetricsSnapshot | undefined
  for (const snapshot of history) {
    if (snapshot.capturedAt.getTime() > cutoff) continue
    if (anchor === undefined || snapshot.capturedAt.getTime() > anchor.capturedAt.getTime()) {
      anchor = snapshot
    }
  }
  return anchor === undefined ? 0 : currentStars - anchor.stars
}
