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

/**
 * Per-kind presentation.
 *
 * Deliberately colourless. An earlier version gave each kind its own hue —
 * violet skills, amber MCP servers — which produced a six-colour rainbow that
 * competed with the one accent and encoded nothing a reader could learn. The
 * chip already says "MCP server" in words, which is unambiguous, translatable
 * and readable without colour vision. The accent is reserved for the two things
 * that genuinely need to stand out: a verified badge and the primary action.
 */
export const KIND_CHIP =
  'inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground'

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
