import type { Artifact } from '../../domain/artifact/artifact.js'
import type { ArtifactKind } from '../../domain/artifact/artifact-kind.js'
import type { ArtifactPayload } from '../../domain/artifact/artifact-payload.js'
import type { InstallPlan } from '../../domain/artifact/install-plan.js'
import { sourceUrl } from '../../domain/artifact/source-ref.js'
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
  readonly updatedAt: string
}

export interface ArtifactDetailDto extends ArtifactSummaryDto {
  readonly payload: ArtifactPayload
  readonly readmeMarkdown?: string
  readonly publishedAt: string
}

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
    updatedAt: artifact.updatedAt.toISOString(),
  }
}

export function toDetailDto(artifact: Artifact): ArtifactDetailDto {
  return {
    ...toSummaryDto(artifact),
    payload: artifact.payload,
    ...(artifact.readmeMarkdown === undefined
      ? {}
      : { readmeMarkdown: artifact.readmeMarkdown }),
    publishedAt: artifact.publishedAt.toISOString(),
  }
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
  }
}
