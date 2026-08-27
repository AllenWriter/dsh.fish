import { Agent } from 'agents'
import type { QueueItem } from 'agents'
import { drizzle } from 'drizzle-orm/d1'
import { readmeDigest } from '../../application/lib/readme-digest.js'
import type { ScheduleReadmeLocalizationInput } from '../../application/port/readme-localization.js'
import type { ReadmeTranslation } from '../../domain/artifact/readme-translation.js'
import type { SummaryTranslation } from '../../domain/artifact/summary-translation.js'
import { slug } from '../../domain/shared/slug.js'
import type { HubEnv } from '../config/env.js'
import { D1ArtifactRepository } from '../persistence/d1-artifact-repository.js'
import { D1ReadmeTranslationRepository } from '../persistence/d1-readme-translation-repository.js'
import { D1SummaryTranslationRepository } from '../persistence/d1-summary-translation-repository.js'
import * as schema from '../persistence/schema.js'
import {
  translateReadmeWithDeepSeek,
  translateSummaryWithDeepSeek,
} from './deepseek-readme-translator.js'
import {
  translateReadmeWithOpenCodeGo,
  translateSummaryWithOpenCodeGo,
} from './opencode-go-readme-translator.js'

export interface EnqueueReadmeInput extends ScheduleReadmeLocalizationInput {
  readonly locales: readonly string[]
}

interface TranslateLocaleTask {
  readonly artifactId: string
  readonly locale: string
  readonly sourceHash?: string
  readonly summaryHash: string
}

const LOCALE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/

/**
 * Durable localization worker, sharded by artifact id.
 *
 * Each artifact gets an independent Agent instance and FIFO. A failing README
 * therefore cannot block translations for the rest of the catalog. The queue
 * durably accepts work before this RPC returns; per-task retries happen inside
 * the callback so queue-level head-of-line backoff is avoided.
 *
 * One task per locale covers both the README and the summary. Each half skips
 * itself when its stored row is already current, so a retry after a partial
 * failure only pays for the half that is still missing.
 */
export class ReadmeI18nAgent extends Agent<HubEnv> {
  async enqueueReadme(input: EnqueueReadmeInput): Promise<void> {
    const artifactId = slug(input.artifactId)
    const locales = [...new Set(input.locales)]
    if (locales.length === 0 || locales.some((locale) => !LOCALE.test(locale))) {
      throw new Error('README localization needs valid target locales.')
    }

    const sourceHash =
      input.markdown === undefined ? undefined : await readmeDigest(input.markdown)
    const summaryHash = await readmeDigest(input.summary)
    // Also advances the source hashes, topic membership and base FTS document;
    // the stock backfill therefore prepares search before its rollout flag is enabled.
    await this.artifactRepository().refreshSearchMetadata(artifactId)
    const translations = this.translationRepository()
    const summaries = this.summaryRepository()

    for (const locale of locales) {
      const task: TranslateLocaleTask = { artifactId, locale, sourceHash, summaryHash }
      const readmeStale = sourceHash !== undefined && (await this.isStale(translations, task))
      const summaryStale = await this.isStale(summaries, task)
      if (!readmeStale && !summaryStale) {
        await this.artifactRepository().refreshLocalizedSearchDocument(artifactId, locale)
        continue
      }

      if (readmeStale) await translations.save(readmeRecord(task, 'pending'))
      if (summaryStale) await summaries.save(summaryRecord(task, 'pending'))
      await this.queue('translateLocale', task, {
        // `translateLocale` owns retries so it can persist a terminal failure.
        retry: { maxAttempts: 1 },
      })
    }
  }

  async translateLocale(
    task: TranslateLocaleTask,
    _queueItem: QueueItem<TranslateLocaleTask>,
  ): Promise<void> {
    const artifactId = slug(task.artifactId)
    const artifact = await this.artifactRepository().findById(artifactId)
    const failures: string[] = []

    // A part whose source changed while the task waited is owned by a newer
    // ingestion call; this old task must not overwrite its status or prose.
    const markdown = artifact?.readmeMarkdown
    if (markdown !== undefined && (await readmeDigest(markdown)) === task.sourceHash) {
      const existing = await this.translationRepository().find(artifactId, task.locale)
      if (existing?.sourceHash !== task.sourceHash || existing.status !== 'completed') {
        try {
          const translated = await this.retry(
            () => this.translate('readme', markdown, task.locale),
            { maxAttempts: 3, baseDelayMs: 1_000, maxDelayMs: 8_000 },
          )
          await this.translationRepository().save(readmeRecord(task, 'completed', { markdown: translated }))
        } catch (error) {
          await this.translationRepository().save(readmeRecord(task, 'failed', { error: describe(error) }))
          failures.push(`readme: ${describe(error)}`)
        }
      }
    }

    const summary = artifact?.summary
    if (summary !== undefined && summary !== '' && (await readmeDigest(summary)) === task.summaryHash) {
      const existing = await this.summaryRepository().find(artifactId, task.locale)
      if (existing?.sourceHash !== task.summaryHash || existing.status !== 'completed') {
        try {
          const translated = await this.retry(
            () => this.translate('summary', summary, task.locale),
            { maxAttempts: 3, baseDelayMs: 1_000, maxDelayMs: 8_000 },
          )
          await this.summaryRepository().save(summaryRecord(task, 'completed', { text: translated }))
        } catch (error) {
          await this.summaryRepository().save(summaryRecord(task, 'failed', { error: describe(error) }))
          failures.push(`summary: ${describe(error)}`)
        }
      }
    }

    if (failures.length > 0) throw new Error(failures.join('; '))
    await this.artifactRepository().refreshLocalizedSearchDocument(artifactId, task.locale)
  }

  /**
   * Off-peak the paid DeepSeek leg runs first (thinking disabled, cached
   * prefix); during its peak pricing hours it suspends itself and the
   * OpenCode Go chain carries the load. Any DeepSeek failure likewise falls
   * through to Go.
   */
  private async translate(kind: 'readme' | 'summary', text: string, locale: string): Promise<string> {
    const deepseekKey = this.env.DEEPSEEK_API_KEY
    if (deepseekKey !== undefined && deepseekKey.trim() !== '') {
      try {
        return kind === 'readme'
          ? await translateReadmeWithDeepSeek(deepseekKey, text, locale)
          : await translateSummaryWithDeepSeek(deepseekKey, text, locale)
      } catch (error) {
        console.warn('readme_i18n_deepseek_fallback', describe(error))
      }
    }
    return kind === 'readme'
      ? translateReadmeWithOpenCodeGo(this.env.OPENCODE_GO_API_KEY, text, locale)
      : translateSummaryWithOpenCodeGo(this.env.OPENCODE_GO_API_KEY, text, locale)
  }

  private async isStale(
    repository: D1ReadmeTranslationRepository | D1SummaryTranslationRepository,
    task: TranslateLocaleTask,
  ): Promise<boolean> {
    const existing = await repository.find(slug(task.artifactId), task.locale)
    const hash = repository instanceof D1SummaryTranslationRepository ? task.summaryHash : task.sourceHash
    return existing?.sourceHash !== hash || existing?.status === 'failed'
  }

  private artifactRepository(): D1ArtifactRepository {
    return new D1ArtifactRepository(drizzle(this.env.DB, { schema }))
  }

  private translationRepository(): D1ReadmeTranslationRepository {
    return new D1ReadmeTranslationRepository(drizzle(this.env.DB, { schema }))
  }

  private summaryRepository(): D1SummaryTranslationRepository {
    return new D1SummaryTranslationRepository(drizzle(this.env.DB, { schema }))
  }
}

function readmeRecord(
  task: TranslateLocaleTask,
  status: ReadmeTranslation['status'],
  result: { readonly markdown?: string; readonly error?: string } = {},
): ReadmeTranslation {
  if (task.sourceHash === undefined) throw new Error('README task has no source hash.')
  return {
    artifactId: slug(task.artifactId),
    locale: task.locale,
    sourceHash: task.sourceHash,
    status,
    ...(result.markdown === undefined ? {} : { markdown: result.markdown }),
    ...(result.error === undefined ? {} : { error: result.error.slice(0, 1_000) }),
    updatedAt: new Date(),
  }
}

function summaryRecord(
  task: TranslateLocaleTask,
  status: SummaryTranslation['status'],
  result: { readonly text?: string; readonly error?: string } = {},
): SummaryTranslation {
  return {
    artifactId: slug(task.artifactId),
    locale: task.locale,
    sourceHash: task.summaryHash,
    status,
    ...(result.text === undefined ? {} : { text: result.text }),
    ...(result.error === undefined ? {} : { error: result.error.slice(0, 1_000) }),
    updatedAt: new Date(),
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
