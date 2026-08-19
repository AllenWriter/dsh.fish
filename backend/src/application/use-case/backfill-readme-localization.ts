import type {
  ReadmeLocalizationBackfillProgress,
  ReadmeLocalizationBackfillSource,
  ReadmeLocalizationBackfillState,
  ReadmeLocalizationScheduler,
} from '../port/readme-localization.js'

const DEFAULT_BATCH_SIZE = 10

/**
 * A terminal failure is retried only after the provider's rolling usage
 * window has had time to reset. Every attempt stamps `updatedAt`, so a
 * permanently failing README costs at most one batch per delay interval.
 */
const FAILED_RETRY_DELAY_MS = 6 * 60 * 60 * 1_000

export interface BackfillReadmeLocalizationReport {
  readonly scheduledArtifacts: number
  readonly retriedArtifacts: number
  readonly complete: boolean
  readonly afterArtifactId?: string
}

/**
 * Incrementally schedules every stored README for the current translation
 * policy. A small batch limits provider concurrency while the minutely trigger
 * makes a newly deployed policy begin within the next Cron invocation.
 *
 * Cursor persistence happens only after the complete batch is accepted. If an
 * RPC or KV write fails, the next invocation safely repeats the page because
 * each per-artifact Agent deduplicates locale + policy hash.
 *
 * The forward-only cursor never revisits an artifact, so each run also
 * reschedules a bounded batch of stale terminal failures. The per-artifact
 * Agent re-queues only locales whose stored row is still `failed`; `pending`
 * and `completed` rows with a matching hash are skipped there.
 */
export class BackfillReadmeLocalization {
  constructor(
    private readonly source: ReadmeLocalizationBackfillSource,
    private readonly progress: ReadmeLocalizationBackfillProgress,
    private readonly scheduler: ReadmeLocalizationScheduler,
  ) {}

  async execute(limit = DEFAULT_BATCH_SIZE): Promise<BackfillReadmeLocalizationReport> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error('README localization backfill limit must be between 1 and 100.')
    }

    let state = await this.progress.load()
    let scheduled = 0
    if (!state.complete) {
      const items = await this.source.listAfter(state.afterArtifactId, limit)
      for (const item of items) {
        await this.scheduler.schedule(item)
      }
      scheduled = items.length

      const last = items.at(-1)
      const afterArtifactId = last?.artifactId ?? state.afterArtifactId
      state = {
        ...(afterArtifactId === undefined ? {} : { afterArtifactId }),
        complete: items.length < limit,
      }
      await this.progress.save(state)
    }

    const retriedArtifacts = await this.retryStaleFailures(limit)
    return report(scheduled, retriedArtifacts, state)
  }

  private async retryStaleFailures(limit: number): Promise<number> {
    const staleBefore = new Date(Date.now() - FAILED_RETRY_DELAY_MS)
    const items = await this.source.listStaleFailures(staleBefore, limit)
    for (const item of items) {
      await this.scheduler.schedule(item)
    }
    return items.length
  }
}

function report(
  scheduledArtifacts: number,
  retriedArtifacts: number,
  state: ReadmeLocalizationBackfillState,
): BackfillReadmeLocalizationReport {
  return {
    scheduledArtifacts,
    retriedArtifacts,
    complete: state.complete,
    ...(state.afterArtifactId === undefined
      ? {}
      : { afterArtifactId: String(state.afterArtifactId) }),
  }
}
