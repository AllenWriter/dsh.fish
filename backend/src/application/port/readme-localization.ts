import type { Slug } from '../../domain/shared/slug.js'

export interface ScheduleReadmeLocalizationInput {
  readonly artifactId: Slug
  readonly markdown: string
}

/**
 * Application port for durable, asynchronous README localization.
 *
 * The ingestion use cases only know that the work was accepted. Cloudflare
 * Agents, queues and model-provider HTTP calls stay behind the infrastructure
 * adapter.
 */
export interface ReadmeLocalizationScheduler {
  schedule(input: ScheduleReadmeLocalizationInput): Promise<void>
}

export interface ReadmeLocalizationBackfillItem {
  readonly artifactId: Slug
  readonly markdown: string
}

/** Read projection used only by the one-time, paginated localization backfill. */
export interface ReadmeLocalizationBackfillSource {
  listAfter(
    afterArtifactId: Slug | undefined,
    limit: number,
  ): Promise<readonly ReadmeLocalizationBackfillItem[]>
}

export interface ReadmeLocalizationBackfillState {
  readonly afterArtifactId?: Slug
  readonly complete: boolean
}

/** Durable cursor; the infrastructure adapter stores it in KV. */
export interface ReadmeLocalizationBackfillProgress {
  load(): Promise<ReadmeLocalizationBackfillState>
  save(state: ReadmeLocalizationBackfillState): Promise<void>
}
