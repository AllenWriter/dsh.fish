import { Agent } from 'agents'
import type { QueueItem } from 'agents'
import { drizzle } from 'drizzle-orm/d1'
import { readmeDigest } from '../../application/lib/readme-digest.js'
import type { ScheduleReadmeLocalizationInput } from '../../application/port/readme-localization.js'
import type { ReadmeTranslation } from '../../domain/artifact/readme-translation.js'
import { slug } from '../../domain/shared/slug.js'
import type { HubEnv } from '../config/env.js'
import { D1ArtifactRepository } from '../persistence/d1-artifact-repository.js'
import { D1ReadmeTranslationRepository } from '../persistence/d1-readme-translation-repository.js'
import * as schema from '../persistence/schema.js'
import { translateReadmeWithDeepSeek } from './deepseek-readme-translator.js'
import { translateReadmeWithOpenCodeGo } from './opencode-go-readme-translator.js'

export interface EnqueueReadmeInput extends ScheduleReadmeLocalizationInput {
  readonly locales: readonly string[]
}

interface TranslateLocaleTask {
  readonly artifactId: string
  readonly locale: string
  readonly sourceHash: string
}

const LOCALE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/

/**
 * Durable localization worker, sharded by artifact id.
 *
 * Each artifact gets an independent Agent instance and FIFO. A failing README
 * therefore cannot block translations for the rest of the catalog. The queue
 * durably accepts work before this RPC returns; per-task retries happen inside
 * the callback so queue-level head-of-line backoff is avoided.
 */
export class ReadmeI18nAgent extends Agent<HubEnv> {
  async enqueueReadme(input: EnqueueReadmeInput): Promise<void> {
    const artifactId = slug(input.artifactId)
    const locales = [...new Set(input.locales)]
    if (locales.length === 0 || locales.some((locale) => !LOCALE.test(locale))) {
      throw new Error('README localization needs valid target locales.')
    }

    const sourceHash = await readmeDigest(input.markdown)
    const translations = this.translationRepository()

    for (const locale of locales) {
      const existing = await translations.find(artifactId, locale)
      if (
        existing?.sourceHash === sourceHash &&
        (existing.status === 'pending' || existing.status === 'completed')
      ) {
        continue
      }

      const task: TranslateLocaleTask = { artifactId, locale, sourceHash }
      await this.queue('translateLocale', task, {
        // `translateLocale` owns retries so it can persist a terminal failure.
        retry: { maxAttempts: 1 },
      })
      await translations.save(record(task, 'pending'))
    }
  }

  async translateLocale(
    task: TranslateLocaleTask,
    _queueItem: QueueItem<TranslateLocaleTask>,
  ): Promise<void> {
    const artifactId = slug(task.artifactId)
    const translations = this.translationRepository()
    const artifact = await this.artifactRepository().findById(artifactId)
    const markdown = artifact?.readmeMarkdown

    // The row was deleted, lost its README, or refreshed while this task was
    // waiting. A newer ingestion call owns the replacement task, so this old
    // one must not overwrite its status or prose.
    if (markdown === undefined || (await readmeDigest(markdown)) !== task.sourceHash) return

    try {
      const translated = await this.retry(() => this.translate(markdown, task.locale), {
        maxAttempts: 3,
        baseDelayMs: 1_000,
        maxDelayMs: 8_000,
      })
      await translations.save(record(task, 'completed', { markdown: translated }))
    } catch (error) {
      await translations.save(record(task, 'failed', { error: describe(error) }))
      throw error
    }
  }

  /**
   * Off-peak the paid DeepSeek leg runs first (thinking disabled, cached
   * prefix); during its peak pricing hours it suspends itself and the free
   * OpenCode Go chain carries the load. Any DeepSeek failure likewise falls
   * through to Go.
   */
  private async translate(markdown: string, locale: string): Promise<string> {
    const deepseekKey = this.env.DEEPSEEK_API_KEY
    if (deepseekKey !== undefined && deepseekKey.trim() !== '') {
      try {
        return await translateReadmeWithDeepSeek(deepseekKey, markdown, locale)
      } catch (error) {
        console.warn('readme_i18n_deepseek_fallback', describe(error))
      }
    }
    return translateReadmeWithOpenCodeGo(this.env.OPENCODE_GO_API_KEY, markdown, locale)
  }

  private artifactRepository(): D1ArtifactRepository {
    return new D1ArtifactRepository(drizzle(this.env.DB, { schema }))
  }

  private translationRepository(): D1ReadmeTranslationRepository {
    return new D1ReadmeTranslationRepository(drizzle(this.env.DB, { schema }))
  }
}

function record(
  task: TranslateLocaleTask,
  status: ReadmeTranslation['status'],
  result: { readonly markdown?: string; readonly error?: string } = {},
): ReadmeTranslation {
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

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
