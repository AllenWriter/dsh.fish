import type {
  ReadmeLocalizationBackfillProgress,
  ReadmeLocalizationBackfillSource,
  ReadmeLocalizationScheduler,
} from '../port/readme-localization.js'

const DEFAULT_BATCH_SIZE = 10

export interface BackfillReadmeLocalizationReport {
  readonly scheduledArtifacts: number
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

    const state = await this.progress.load()
    if (state.complete) return report(0, state)

    const items = await this.source.listAfter(state.afterArtifactId, limit)
    for (const item of items) {
      await this.scheduler.schedule(item)
    }

    const last = items.at(-1)
    const afterArtifactId = last?.artifactId ?? state.afterArtifactId
    const next = {
      ...(afterArtifactId === undefined ? {} : { afterArtifactId }),
      complete: items.length < limit,
    }
    await this.progress.save(next)
    return report(items.length, next)
  }
}

function report(
  scheduledArtifacts: number,
  state: Awaited<ReturnType<ReadmeLocalizationBackfillProgress['load']>>,
): BackfillReadmeLocalizationReport {
  return {
    scheduledArtifacts,
    complete: state.complete,
    ...(state.afterArtifactId === undefined
      ? {}
      : { afterArtifactId: String(state.afterArtifactId) }),
  }
}
