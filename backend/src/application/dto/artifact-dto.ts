import type { Artifact } from '../../domain/artifact/artifact.js'
import type { ArtifactKind } from '../../domain/artifact/artifact-kind.js'
import type { ArtifactPayload } from '../../domain/artifact/artifact-payload.js'
import type { InstallPlan } from '../../domain/artifact/install-plan.js'
import type { MaintenanceStatus, QualityGrade } from '../../domain/artifact/quality-score.js'
import {
  sourceAssetBase,
  sourceCommitUrl,
  sourceDocBase,
  sourceUrl,
} from '../../domain/artifact/source-ref.js'
import type { Page } from '../../domain/shared/pagination.js'

/**
 * Transport shapes. Entities never cross the interface boundary: a DTO is JSON
 * by construction, so a Date or a branded slug cannot leak into a response.
 */
export interface ArtifactSummaryDto {
  readonly id: string
  readonly kind: ArtifactKind
  readonly displayName: string
  readonly summary: string
  readonly keywords: readonly string[]
  readonly categories: readonly string[]
  readonly sourceOrigin: string
  readonly sourceUrl: string
  readonly author?: { name: string; url?: string }
  readonly license?: string
  readonly verified: boolean
  readonly deprecated: boolean
  readonly stats: { stars: number; downloads: number; installs: number }
  /** Public quality score, 0–100; reproducible from `GET /api/v1/scoring`. */
  readonly score: number
  readonly grade: QualityGrade
  readonly maintenanceStatus: MaintenanceStatus
  /** Stars gained over the trailing 7 / 30 days, from `artifact_metrics` history. */
  readonly starVelocity7d: number
  readonly starVelocity30d: number
  readonly updatedAt: string
  /** GitHub Social preview, when the source repository has one. */
  readonly ogImageUrl?: string
}

export interface ArtifactDetailDto extends ArtifactSummaryDto {
  readonly payload: ArtifactPayload
  readonly readmeMarkdown?: string
  /** Locale of the generated README returned for this request. */
  readonly readmeLocale?: string
  /** True only when `readmeMarkdown` is a machine-generated translation. */
  readonly readmeMachineTranslated?: boolean
  /** What a relative link in `readmeMarkdown` points at. Absent when unknowable. */
  readonly sourceDocBase?: string
  /** What a relative image in `readmeMarkdown` points at. Absent when unknowable. */
  readonly sourceAssetBase?: string
  /**
   * The default-branch HEAD the indexer scanned, when the source is a git
   * repository — scan provenance, so a reader can see exactly which code the
   * catalog row describes.
   */
  readonly sourceCommitSha?: string
  /** Browsable URL of that commit. Absent when there is no pinned commit. */
  readonly sourceCommitUrl?: string
  readonly publishedAt: string
  /**
   * Whether this page can open the Ada-backed ask panel. `reason` is a machine
   * token; the UI maps it through i18n and hides the control when unavailable.
   */
  readonly ask: ArtifactAskDto
}

export type ArtifactAskDto =
  | { readonly available: true; readonly repoName: string }
  | { readonly available: false; readonly reason: 'not_github' | 'disabled' }

export interface PageDto<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly limit: number
  readonly offset: number
}

export interface InstallPlanDto {
  readonly artifactId: string
  readonly kind: ArtifactKind
  readonly profile: string
  readonly steps: InstallPlan['steps']
  readonly manualCommands: readonly string[]
  readonly warningKeys: readonly string[]
  /**
   * The commit the catalog row was scanned from, when the source is a pinned
   * git repository. Display-only provenance; the plan's steps already carry
   * the pin where one exists.
   */
  readonly scannedAtCommit?: string
}

export function toSummaryDto(artifact: Artifact): ArtifactSummaryDto {
  return {
    id: artifact.id,
    kind: artifact.kind,
    displayName: artifact.displayName,
    summary: artifact.summary,
    keywords: artifact.keywords,
    categories: artifact.categories.map(String),
    sourceOrigin: artifact.source.origin,
    sourceUrl: sourceUrl(artifact.source),
    ...(artifact.author === undefined ? {} : { author: artifact.author }),
    ...(artifact.license === undefined ? {} : { license: artifact.license }),
    verified: artifact.verified,
    deprecated: artifact.deprecated,
    stats: artifact.stats,
    score: artifact.qualityScore.score,
    grade: artifact.qualityScore.grade,
    maintenanceStatus: artifact.qualityScore.maintenanceStatus,
    starVelocity7d: artifact.starVelocity7d,
    starVelocity30d: artifact.starVelocity30d,
    updatedAt: artifact.updatedAt.toISOString(),
    ...(artifact.ogImageUrl === undefined ? {} : { ogImageUrl: artifact.ogImageUrl }),
  }
}

export function toDetailDto(
  artifact: Artifact,
  localizedReadme?: { readonly markdown: string; readonly locale: string },
  localizedSummary?: string,
  askEnabled = false,
): ArtifactDetailDto {
  const docBase = sourceDocBase(artifact.source)
  const assetBase = sourceAssetBase(artifact.source)
  const commitUrl = sourceCommitUrl(artifact.source)

  return {
    ...toSummaryDto(artifact),
    ...(localizedSummary === undefined ? {} : { summary: localizedSummary }),
    payload: artifact.payload,
    ...(localizedReadme !== undefined
      ? {
          readmeMarkdown: localizedReadme.markdown,
          readmeLocale: localizedReadme.locale,
          readmeMachineTranslated: true,
        }
      : artifact.readmeMarkdown === undefined
        ? {}
        : { readmeMarkdown: artifact.readmeMarkdown }),
    ...(docBase === undefined ? {} : { sourceDocBase: docBase }),
    ...(assetBase === undefined ? {} : { sourceAssetBase: assetBase }),
    ...(artifact.sourceCommitSha === undefined
      ? {}
      : { sourceCommitSha: artifact.sourceCommitSha }),
    ...(commitUrl === undefined ? {} : { sourceCommitUrl: commitUrl }),
    publishedAt: artifact.publishedAt.toISOString(),
    ask: artifactAsk(artifact, askEnabled),
  }
}

export function artifactAsk(artifact: Artifact, askEnabled: boolean): ArtifactAskDto {
  if (artifact.source.origin !== 'github') {
    return { available: false, reason: 'not_github' }
  }
  if (!askEnabled) {
    return { available: false, reason: 'disabled' }
  }
  return { available: true, repoName: `${artifact.source.owner}/${artifact.source.repo}` }
}

export function toPageDto<T, R>(source: Page<T>, map: (item: T) => R): PageDto<R> {
  return {
    items: source.items.map(map),
    total: source.total,
    limit: source.limit,
    offset: source.offset,
  }
}

export function toInstallPlanDto(plan: InstallPlan): InstallPlanDto {
  return {
    artifactId: plan.artifactId,
    kind: plan.kind,
    profile: plan.target.profile,
    steps: plan.steps,
    manualCommands: plan.manualCommands,
    warningKeys: plan.warningKeys,
    ...(plan.scannedAtCommit === undefined ? {} : { scannedAtCommit: plan.scannedAtCommit }),
  }
}
