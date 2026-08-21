import type { Slug } from '../../domain/shared/slug.js'

export interface ScheduleReadmeLocalizationInput {
  readonly artifactId: Slug
  readonly markdown?: string
  readonly summary: string
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
  readonly markdown?: string
  readonly summary: string
}

/** Read projection used only by the one-time, paginated localization backfill. */
export interface ReadmeLocalizationBackfillSource {
  listAfter(
    afterArtifactId: Slug | undefined,
    limit: number,
  ): Promise<readonly ReadmeLocalizationBackfillItem[]>

  /**
   * Artifacts whose latest translation attempt failed before `olderThan`.
   * The backfill reschedules them because the forward-only cursor never
   * revisits a failed artifact on its own.
   */
  listStaleFailures(
    olderThan: Date,
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
