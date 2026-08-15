import type {
  ArtifactDetailDto,
  ArtifactSummaryDto,
  InstallPlanDto,
  PageDto,
} from '@dsh-fish/backend/application/dto/artifact-dto.js'
import type { ArtifactKind } from '@dsh-fish/backend/domain/artifact/artifact-kind.js'
import type { FacetsDto } from '@dsh-fish/backend/application/use-case/list-catalog-facets.js'

/**
 * The frontend's view of catalog data is the backend's DTO contract, imported
 * as types only. One declaration means a renamed field breaks the build here
 * instead of rendering `undefined` in production.
 */
export type {
  ArtifactDetailDto,
  ArtifactKind,
  ArtifactSummaryDto,
  FacetsDto,
  InstallPlanDto,
  PageDto,
}

export type Artifact = ArtifactSummaryDto
export type ArtifactDetail = ArtifactDetailDto

/** Per-kind presentation. Labels stay as message keys; only colour lives here. */
export const KIND_STYLE: Readonly<
  Record<ArtifactKind, { readonly chip: string; readonly dot: string }>
> = {
  bundle: {
    chip: 'bg-primary/10 text-primary border-primary/20',
    dot: 'bg-primary',
  },
  profile: {
    chip: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  skill: {
    chip: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  'mcp-server': {
    chip: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
  'agent-preset': {
    chip: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  'hook-bridge': {
    chip: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
}

const KIND_MESSAGE_KEY: Readonly<Record<ArtifactKind, string>> = {
  bundle: 'artifactKind.bundle.label',
  profile: 'artifactKind.profile.label',
  skill: 'artifactKind.skill.label',
  'mcp-server': 'artifactKind.mcpServer.label',
  'agent-preset': 'artifactKind.agentPreset.label',
  'hook-bridge': 'artifactKind.hookBridge.label',
}

export function kindLabelKey(kind: ArtifactKind): string {
  return KIND_MESSAGE_KEY[kind]
}
