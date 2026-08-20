import type { Slug } from '../shared/slug.js'

export type SummaryTranslationStatus = 'pending' | 'completed' | 'failed'

/**
 * One derived summary translation.
 *
 * Same contract as the README translation: `sourceHash` ties the generated
 * text to the exact upstream summary and current translation policy, so
 * output from an older summary, model or prompt is never served while its
 * replacement is queued.
 */
export interface SummaryTranslation {
  readonly artifactId: Slug
  readonly locale: string
  readonly sourceHash: string
  readonly status: SummaryTranslationStatus
  readonly text?: string
  readonly error?: string
  readonly updatedAt: Date
}

/** Persistence port for summary localization state and completed text. */
export interface SummaryTranslationRepository {
  find(artifactId: Slug, locale: string): Promise<SummaryTranslation | undefined>
  /** All current rows for one locale across many artifacts, for listing pages. */
  listFor(artifactIds: readonly Slug[], locale: string): Promise<readonly SummaryTranslation[]>
  save(translation: SummaryTranslation): Promise<void>
}
