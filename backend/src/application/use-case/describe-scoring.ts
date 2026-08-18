import { SCORING_MODEL } from '../../domain/artifact/quality-score.js'

export interface ScoringModelDto {
  readonly weights: typeof SCORING_MODEL.weights
  readonly popularity: typeof SCORING_MODEL.popularity
  readonly maintenance: typeof SCORING_MODEL.maintenance
  readonly quality: typeof SCORING_MODEL.quality
  readonly grades: typeof SCORING_MODEL.grades
}

/**
 * Publish the scoring model as data.
 *
 * The score is a promise of transparency: anyone must be able to recompute
 * what the site shows. The use case returns the same `SCORING_MODEL` constant
 * the domain executes, so the documented formula and the executed formula
 * cannot drift apart.
 */
export class DescribeScoring {
  execute(): ScoringModelDto {
    return SCORING_MODEL
  }
}
