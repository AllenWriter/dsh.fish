import { Artifact, artifactContentChanged } from '../../domain/artifact/artifact.js'
import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { mergeProvenance } from '../../domain/artifact/source-ref.js'
import { slug } from '../../domain/shared/slug.js'
import { isDomainError } from '../../domain/shared/error.js'
import type { IndexedSnapshot, SourceIndexer } from '../port/source-indexer.js'
import type { ReadmeLocalizationScheduler } from '../port/readme-localization.js'

export interface IngestReport {
  readonly scanned: number
  readonly created: number
  readonly updated: number
  /** Swept rows whose content and stats were both identical to the stored row. */
  readonly unchanged: number
  readonly skipped: number
  readonly errors: readonly { readonly id: string; readonly reason: string }[]
}

export interface IngestCatalogInput {
  /** Per-indexer candidate cap, so one scheduled run stays inside a Worker's budget. */
  readonly limitPerSource?: number
  /**
   * Per-origin override.
   *
   * A candidate costs a different number of subrequests at each source — a
   * GitHub repository is three cheap probes until one of them classifies it, an
   * npm package is always a packument plus a downloads call — so one number
   * cannot spend the Worker's budget well at both.
   */
  readonly limitByOrigin?: Readonly<Partial<Record<SourceIndexer['origin'], number>>>
}

const DEFAULT_LIMIT = 100

/**
 * Fold freshly crawled snapshots into the catalog.
 *
 * Runs on a Cron Trigger. It is deliberately tolerant: one malformed package
 * must not abort a sweep, because a single bad publish upstream would otherwise
 * stop the whole registry from refreshing.
 *
 * An artifact whose content changed is rewritten and gets a fresh
 * `artifact_metrics` row; one where only stars/downloads moved gets the metrics
 * row alone, which also refreshes the counters stored on the catalog row; one
 * where nothing moved is not written at all. D1 bills per row written, and the
 * vast majority of a sweep re-finds what the last sweep already stored.
 */
export class IngestCatalog {
  constructor(
    private readonly artifacts: ArtifactRepository,
    private readonly indexers: readonly SourceIndexer[],
    private readonly readmeLocalization: ReadmeLocalizationScheduler,
  ) {}

  async execute(input: IngestCatalogInput = {}): Promise<IngestReport> {
    let scanned = 0
    let created = 0
    let updated = 0
    let unchanged = 0
    let skipped = 0
    const errors: { id: string; reason: string }[] = []

    for (const indexer of this.indexers) {
      const limit = input.limitByOrigin?.[indexer.origin] ?? input.limitPerSource ?? DEFAULT_LIMIT
      let snapshots: readonly IndexedSnapshot[]
      try {
        snapshots = await indexer.discover(limit)
      } catch (error) {
        errors.push({ id: indexer.origin, reason: describe(error) })
        continue
      }

      for (const snapshot of snapshots) {
        scanned += 1
        try {
          const existing = await this.artifacts.findById(slug(snapshot.id))
          if (existing) {
            const refreshed = existing.refreshedWith({
              displayName: snapshot.displayName,
              summary: snapshot.summary,
              // The fresh reference wins on every field; curated-list
              // provenance (`via`) accumulates across sweeps.
              source: mergeProvenance(existing.source, snapshot.source),
              payload: snapshot.payload,
              keywords: snapshot.keywords,
              categories: snapshot.categories,
              stats: { ...snapshot.stats, installs: existing.stats.installs },
              ...(snapshot.license === undefined ? {} : { license: snapshot.license }),
              ...(snapshot.author === undefined ? {} : { author: snapshot.author }),
              ...(snapshot.readmeMarkdown === undefined
                ? {}
                : { readmeMarkdown: snapshot.readmeMarkdown }),
              ...(snapshot.ogImageUrl === undefined ? {} : { ogImageUrl: snapshot.ogImageUrl }),
              ...(snapshot.sourceCommitSha === undefined
                ? {}
                : { sourceCommitSha: snapshot.sourceCommitSha }),
              ...(snapshot.deprecated === undefined ? {} : { deprecated: snapshot.deprecated }),
            })
            const previousProps = existing.toProps()
            const refreshedProps = refreshed.toProps()
            const contentChanged = artifactContentChanged(previousProps, refreshedProps)
            const statsChanged =
              refreshedProps.stats.stars !== previousProps.stats.stars ||
              refreshedProps.stats.downloads !== previousProps.stats.downloads

            if (!contentChanged && !statsChanged) {
              unchanged += 1
              continue
            }

            if (contentChanged) {
              await this.artifacts.save(refreshed)
            }
            await this.artifacts.recordMetricsSnapshot(refreshed)
            updated += 1
            // A README is re-localized only when the Markdown itself changed;
            // the per-locale dedup reads are too expensive to pay per sweep.
            if (contentChanged && refreshedProps.readmeMarkdown !== previousProps.readmeMarkdown) {
              await scheduleReadmeLocalization(this.readmeLocalization, refreshed)
            }
          } else {
            const createdArtifact = toArtifact(snapshot)
            await this.artifacts.save(createdArtifact)
            await this.artifacts.recordMetricsSnapshot(createdArtifact)
            created += 1
            await scheduleReadmeLocalization(this.readmeLocalization, createdArtifact)
          }
        } catch (error) {
          if (isDomainError(error) && error.code === 'INVALID_ARGUMENT') {
            // An upstream package that cannot satisfy a catalog invariant is
            // not an outage; record it and keep sweeping.
            skipped += 1
            continue
          }
          errors.push({ id: snapshot.id, reason: describe(error) })
        }
      }
    }

    return { scanned, created, updated, unchanged, skipped, errors }
  }
}

async function scheduleReadmeLocalization(
  scheduler: ReadmeLocalizationScheduler,
  artifact: Artifact,
): Promise<void> {
  const markdown = artifact.readmeMarkdown
  if (markdown === undefined || markdown.trim() === '') return
  await scheduler.schedule({ artifactId: artifact.id, markdown })
}

export function toArtifact(snapshot: IndexedSnapshot, ownerAccountId?: string): Artifact {
  return Artifact.create({
    id: snapshot.id,
    kind: snapshot.kind,
    displayName: snapshot.displayName,
    summary: snapshot.summary,
    source: snapshot.source,
    payload: snapshot.payload,
    keywords: snapshot.keywords,
    categories: snapshot.categories,
    ...(snapshot.license === undefined ? {} : { license: snapshot.license }),
    ...(snapshot.author === undefined ? {} : { author: snapshot.author }),
    ...(snapshot.readmeMarkdown === undefined ? {} : { readmeMarkdown: snapshot.readmeMarkdown }),
    ...(snapshot.ogImageUrl ? { ogImageUrl: snapshot.ogImageUrl } : {}),
    ...(snapshot.sourceCommitSha === undefined
      ? {}
      : { sourceCommitSha: snapshot.sourceCommitSha }),
    stats: {
      stars: snapshot.stats.stars,
      downloads: snapshot.stats.downloads,
      installs: 0,
    },
    ...(ownerAccountId === undefined ? {} : { ownerAccountId }),
    ...(snapshot.deprecated === undefined ? {} : { deprecated: snapshot.deprecated }),
  })
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
