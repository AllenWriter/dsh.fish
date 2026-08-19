import { describe, expect, it } from 'vitest'
import { slug } from '../../domain/shared/slug.js'
import type {
  ReadmeLocalizationBackfillItem,
  ReadmeLocalizationBackfillState,
  ScheduleReadmeLocalizationInput,
} from '../port/readme-localization.js'
import { BackfillReadmeLocalization } from './backfill-readme-localization.js'

function harness(
  items: readonly ScheduleReadmeLocalizationInput[],
  staleFailures: readonly ReadmeLocalizationBackfillItem[] = [],
) {
  let state: ReadmeLocalizationBackfillState = { complete: false }
  const scheduled: ScheduleReadmeLocalizationInput[] = []
  const useCase = new BackfillReadmeLocalization(
    {
      listAfter: async (after, limit) =>
        items.filter((item) => after === undefined || item.artifactId > after).slice(0, limit),
      listStaleFailures: async (_olderThan, limit) => staleFailures.slice(0, limit),
    },
    {
      load: async () => state,
      save: async (next) => {
        state = next
      },
    },
    {
      schedule: async (item) => {
        scheduled.push(item)
      },
    },
  )
  return { useCase, scheduled, state: () => state }
}

describe('BackfillReadmeLocalization', () => {
  it('walks stored READMEs in durable pages and then stays complete', async () => {
    const first = { artifactId: slug('alpha'), markdown: '# Alpha' }
    const second = { artifactId: slug('beta'), markdown: '# Beta' }
    const { useCase, scheduled, state } = harness([first, second])

    await expect(useCase.execute(1)).resolves.toMatchObject({
      scheduledArtifacts: 1,
      retriedArtifacts: 0,
      complete: false,
      afterArtifactId: 'alpha',
    })
    await expect(useCase.execute(2)).resolves.toMatchObject({
      scheduledArtifacts: 1,
      complete: true,
      afterArtifactId: 'beta',
    })
    await expect(useCase.execute(2)).resolves.toMatchObject({
      scheduledArtifacts: 0,
      complete: true,
    })

    expect(scheduled).toEqual([first, second])
    expect(state()).toEqual({ afterArtifactId: second.artifactId, complete: true })
  })

  it('does not advance the cursor when scheduling a page fails', async () => {
    let saved = false
    const useCase = new BackfillReadmeLocalization(
      {
        listAfter: async () => [{ artifactId: slug('alpha'), markdown: '# Alpha' }],
        listStaleFailures: async () => [],
      },
      {
        load: async () => ({ complete: false }),
        save: async () => {
          saved = true
        },
      },
      { schedule: async () => Promise.reject(new Error('Agent unavailable')) },
    )

    await expect(useCase.execute()).rejects.toThrow('Agent unavailable')
    expect(saved).toBe(false)
  })

  it('reschedules stale terminal failures alongside and after the main pass', async () => {
    const fresh = { artifactId: slug('alpha'), markdown: '# Alpha' }
    const failed = { artifactId: slug('zero'), markdown: '# Zero' }
    const { useCase, scheduled } = harness([fresh], [failed])

    await expect(useCase.execute(10)).resolves.toMatchObject({
      scheduledArtifacts: 1,
      retriedArtifacts: 1,
      complete: true,
    })
    // The main pass is complete, yet stale failures keep being retried.
    await expect(useCase.execute(10)).resolves.toMatchObject({
      scheduledArtifacts: 0,
      retriedArtifacts: 1,
      complete: true,
    })

    expect(scheduled).toEqual([fresh, failed, failed])
  })

  it('never scans for stale failures when the caller disables retries', async () => {
    let staleScans = 0
    const useCase = new BackfillReadmeLocalization(
      {
        listAfter: async () => [],
        listStaleFailures: async () => {
          staleScans += 1
          return []
        },
      },
      {
        load: async () => ({ complete: true }),
        save: async () => {},
      },
      { schedule: async () => {} },
    )

    await expect(useCase.execute(10, { retryStaleFailures: false })).resolves.toMatchObject({
      retriedArtifacts: 0,
      complete: true,
    })
    expect(staleScans).toBe(0)
  })

  it('does not rewrite the cursor when a page leaves the state untouched', async () => {
    let saves = 0
    const useCase = new BackfillReadmeLocalization(
      {
        // Returns the cursor position itself, so neither the cursor nor the
        // complete flag moves.
        listAfter: async () => [{ artifactId: slug('alpha'), markdown: '# Alpha' }],
        listStaleFailures: async () => [],
      },
      {
        load: async () => ({ afterArtifactId: slug('alpha'), complete: false }),
        save: async () => {
          saves += 1
        },
      },
      { schedule: async () => {} },
    )

    await expect(useCase.execute(1)).resolves.toMatchObject({
      scheduledArtifacts: 1,
      complete: false,
      afterArtifactId: 'alpha',
    })
    expect(saves).toBe(0)
  })
})
