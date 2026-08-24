import type { Slug } from '../shared/slug.js'

export type ReadmeTranslationStatus = 'pending' | 'completed' | 'failed'

/**
 * One derived README translation.
 *
 * `sourceHash` ties generated prose to the exact upstream Markdown and current
 * translation policy so a replacement can be queued. Readers still see the last
 * completed body until that replacement lands.
 */
export interface ReadmeTranslation {
  readonly artifactId: Slug
  readonly locale: string
  readonly sourceHash: string
  readonly status: ReadmeTranslationStatus
  readonly markdown?: string
  readonly error?: string
  readonly updatedAt: Date
}

/** Persistence port for README localization state and completed Markdown. */
export interface ReadmeTranslationRepository {
  find(artifactId: Slug, locale: string): Promise<ReadmeTranslation | undefined>
  save(translation: ReadmeTranslation): Promise<void>
}
