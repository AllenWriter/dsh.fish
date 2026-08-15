import { DomainError } from '../shared/error.js'

/**
 * Every distributable DeepSeek Harness artifact type.
 *
 * The taxonomy is taken from the harness itself rather than invented here; each
 * member names a real thing dsh already loads, and each has a distinct install
 * mechanism owned by `install-plan.ts`:
 *
 * - `bundle`       npm package declaring `dsh.bundle.patch`; the unit `dsh plugin add` installs.
 * - `profile`      an ordered `dsh.profile.bundles` stack — a whole runnable composition.
 * - `skill`        a `SKILL.md` bundle or flat Markdown file under a skills root.
 * - `mcp-server`   an external MCP server mounted through `@deepseek-ai/dsh-mcp-client`.
 * - `agent-preset` a directory holding one `agent.cordis.yml`.
 * - `hook-bridge`  a Claude Code / Codex shell-hook bridge configuration.
 */
export const ARTIFACT_KINDS = [
  'bundle',
  'profile',
  'skill',
  'mcp-server',
  'agent-preset',
  'hook-bridge',
] as const

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number]

export interface ArtifactKindMeta {
  readonly kind: ArtifactKind
  /** i18n key for the human-facing singular label. Never a literal display string. */
  readonly labelKey: string
  readonly descriptionKey: string
  /** Whether the artifact is resolved by a package manager rather than fetched as files. */
  readonly packageManaged: boolean
}

export const ARTIFACT_KIND_META: Readonly<Record<ArtifactKind, ArtifactKindMeta>> = Object.freeze({
  bundle: {
    kind: 'bundle',
    labelKey: 'artifactKind.bundle.label',
    descriptionKey: 'artifactKind.bundle.description',
    packageManaged: true,
  },
  profile: {
    kind: 'profile',
    labelKey: 'artifactKind.profile.label',
    descriptionKey: 'artifactKind.profile.description',
    packageManaged: true,
  },
  skill: {
    kind: 'skill',
    labelKey: 'artifactKind.skill.label',
    descriptionKey: 'artifactKind.skill.description',
    packageManaged: false,
  },
  'mcp-server': {
    kind: 'mcp-server',
    labelKey: 'artifactKind.mcpServer.label',
    descriptionKey: 'artifactKind.mcpServer.description',
    packageManaged: false,
  },
  'agent-preset': {
    kind: 'agent-preset',
    labelKey: 'artifactKind.agentPreset.label',
    descriptionKey: 'artifactKind.agentPreset.description',
    packageManaged: false,
  },
  'hook-bridge': {
    kind: 'hook-bridge',
    labelKey: 'artifactKind.hookBridge.label',
    descriptionKey: 'artifactKind.hookBridge.description',
    packageManaged: false,
  },
})

export function artifactKind(raw: string): ArtifactKind {
  const value = raw.trim().toLowerCase()
  const match = ARTIFACT_KINDS.find((kind) => kind === value)
  if (!match) {
    throw DomainError.invalid('Unknown artifact kind.', { raw, supported: ARTIFACT_KINDS })
  }
  return match
}

export function isArtifactKind(raw: string): raw is ArtifactKind {
  return (ARTIFACT_KINDS as readonly string[]).includes(raw.trim().toLowerCase())
}
