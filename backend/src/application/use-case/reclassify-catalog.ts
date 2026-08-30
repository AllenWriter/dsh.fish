import { artifactContentChanged } from '../../domain/artifact/artifact.js'
import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { resolveCategories } from '../../domain/artifact/category-inference.js'
import type { SourceRef } from '../../domain/artifact/source-ref.js'
import type { CategoryOverlay } from '../port/category-overlay.js'
import type { OffsetCursor } from '../port/offset-cursor.js'

export interface ReclassifyReport {
  readonly scanned: number
  readonly updated: number
  readonly unchanged: number
  readonly offset: number
  readonly total: number
}

export interface ReclassifyCatalogInput {
  /** Rows this invocation will look at. Kept small: each rewrite is a D1 batch. */
  readonly limit?: number
  /**
   * Where to start. Omitted means "wherever the last run stopped", which is
   * how the hourly cron covers the catalog across invocations.
   */
  readonly offset?: number
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 250

/**
 * Refile stored rows against the current taxonomy without re-probing GitHub.
 *
 * Changing `CATEGORIES` does not rewrite D1: `category_id` is free text, and
 * `rehydrate` does not re-run `normalizeCategories`. A crawl that has not
 * yet re-found a row leaves it on a retired id forever. This pass pages the
 * public catalog, resolves categories from keywords + summary plus the
 * curated overlay, and `save`s only when the set actually moved — which
 * dual-writes the JSON column and the join table.
 *
 * It does not call `refreshSearchMetadata`: that rebuilds topics from stored
 * JSON and would leave categories untouched.
 */
export class ReclassifyCatalog {
  constructor(
    private readonly artifacts: ArtifactRepository,
    private readonly overlay: CategoryOverlay,
    private readonly cursor?: OffsetCursor,
  ) {}

  async execute(input: ReclassifyCatalogInput = {}): Promise<ReclassifyReport> {
    const limit = clampLimit(input.limit)
    const offset = input.offset ?? (await this.readOffset())
    const overlay = await this.overlay.load()

    const page = await this.artifacts.search({
      sort: 'name',
      page: { limit, offset },
    })

    let updated = 0
    let unchanged = 0

    for (const listed of page.items) {
      const curated = curatedFor(listed.source, overlay)
      const next = resolveCategories(
        [],
        {
          keywords: listed.keywords,
          text: `${listed.displayName} ${listed.summary}`,
        },
        curated === undefined ? [] : [curated],
      )
      if (sameCategories(listed.categories.map(String), next.map(String))) {
        unchanged += 1
        continue
      }

      const stored = await this.artifacts.findById(listed.id)
      if (stored === undefined) {
        unchanged += 1
        continue
      }

      const refreshed = stored.refreshedWith({
        displayName: stored.displayName,
        summary: stored.summary,
        source: stored.source,
        payload: stored.payload,
        keywords: stored.keywords,
        categories: next,
        stats: stored.stats,
      })
      if (!artifactContentChanged(stored.toProps(), refreshed.toProps())) {
        unchanged += 1
        continue
      }
      await this.artifacts.save(refreshed)
      updated += 1
    }

    const scanned = page.items.length
    const nextOffset = offset + scanned >= page.total ? 0 : offset + scanned
    if (input.offset === undefined) await this.writeOffset(nextOffset)

    return {
      scanned,
      updated,
      unchanged,
      offset: nextOffset,
      total: page.total,
    }
  }

  private async readOffset(): Promise<number> {
    if (!this.cursor) return 0
    try {
      return (await this.cursor.read()) ?? 0
    } catch {
      return 0
    }
  }

  private async writeOffset(offset: number): Promise<void> {
    if (!this.cursor) return
    try {
      await this.cursor.write(offset)
    } catch {
      // The next run repeats this slice. The pass is idempotent.
    }
  }
}

function clampLimit(raw: number | undefined): number {
  const limit = raw ?? DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1) return DEFAULT_LIMIT
  return Math.min(limit, MAX_LIMIT)
}

function curatedFor(
  source: SourceRef,
  overlay: ReadonlyMap<string, string>,
): string | undefined {
  if (source.origin !== 'github') return undefined
  return overlay.get(`${source.owner}/${source.repo}`.toLowerCase())
}

function sameCategories(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index])
}
