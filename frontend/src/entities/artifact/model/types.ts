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

/**
 * The message-key stem for each kind.
 *
 * One map, two suffixes: `.label` names a single artifact ("Skill", on a chip),
 * `.plural` names the collection ("Skills", as a page heading). Deriving both
 * from one stem is what stops a new kind from being half-translated.
 */
const KIND_MESSAGE_STEM: Readonly<Record<ArtifactKind, string>> = {
  bundle: 'artifactKind.bundle',
  profile: 'artifactKind.profile',
  skill: 'artifactKind.skill',
  'mcp-server': 'artifactKind.mcpServer',
  'agent-preset': 'artifactKind.agentPreset',
  'hook-bridge': 'artifactKind.hookBridge',
}

export function kindLabelKey(kind: ArtifactKind): string {
  return `${KIND_MESSAGE_STEM[kind]}.label`
}

export function kindPluralKey(kind: ArtifactKind): string {
  return `${KIND_MESSAGE_STEM[kind]}.plural`
}

export function kindDescriptionKey(kind: ArtifactKind): string {
  return `${KIND_MESSAGE_STEM[kind]}.description`
}

/**
 * The taxonomy itself, re-exported so the UI layers read it from the entity
 * that owns catalog data rather than reaching into the backend package.
 */
export { ARTIFACT_KINDS, isArtifactKind } from '@dsh-fish/backend/domain/artifact/artifact-kind.js'
export { CATEGORIES, isCategory } from '@dsh-fish/backend/domain/artifact/category.js'
