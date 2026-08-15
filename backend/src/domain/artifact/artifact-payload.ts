import { DomainError } from '../shared/error.js'
import type { ArtifactKind } from './artifact-kind.js'

/**
 * The kind-specific facts an install needs, beyond the source reference.
 *
 * A payload never carries a secret value. Where an artifact needs one — an MCP
 * server's API token, say — it carries the *reference* (a POSIX environment
 * variable name) and the harness resolves it through `ctx.credentials`. This
 * mirrors the harness doctrine that configuration carries references to
 * secrets, never the secrets, and it is what makes a registry row safe to serve
 * publicly and safe to render in a configuration UI.
 */

export interface BundlePayload {
  readonly kind: 'bundle'
  /** Path the package's `dsh.bundle.patch` points at, for display only. */
  readonly patchPath?: string
  /** Whether the package must run a build script on install (git installs of TS sources). */
  readonly requiresBuild: boolean
}

export interface ProfilePayload {
  readonly kind: 'profile'
  /** Ordered bundle specifiers, in `dsh.profile.bundles` order. */
  readonly bundles: readonly string[]
}

export interface SkillFile {
  readonly path: string
  readonly downloadUrl: string
}

export interface SkillPayload {
  readonly kind: 'skill'
  /** Frontmatter `name`; must match the directory the skill installs into. */
  readonly skillName: string
  /** `directory` = `<name>/SKILL.md`; `flat` = a single `<name>.md`. */
  readonly layout: 'directory' | 'flat'
  readonly files: readonly SkillFile[]
}

export interface CredentialRequirement {
  /** POSIX shell identifier resolved through `ctx.credentials`, e.g. `GITHUB_TOKEN`. */
  readonly envName: string
  readonly required: boolean
  readonly descriptionKey?: string
}

export type McpTransport = 'stdio' | 'streamable-http'

export interface McpServerPayload {
  readonly kind: 'mcp-server'
  /** Namespace for model-facing tool names: `mcp__<serverName>__<rawName>`. */
  readonly serverName: string
  readonly transport: McpTransport
  readonly command?: string
  readonly args?: readonly string[]
  readonly url?: string
  /** Credential references only — never values. */
  readonly credentials: readonly CredentialRequirement[]
}

export interface AgentPresetPayload {
  readonly kind: 'agent-preset'
  /** Preset id; becomes the directory name under `<dshHome>/.agent-presets`. */
  readonly presetId: string
  readonly compositionUrl: string
}

export type HookDialect = 'claude-code' | 'codex'

export interface HookBridgePayload {
  readonly kind: 'hook-bridge'
  readonly dialect: HookDialect
  /** Path the bridge plugin reads its external hook definitions from. */
  readonly settingsPath: string
}

export type ArtifactPayload =
  | BundlePayload
  | ProfilePayload
  | SkillPayload
  | McpServerPayload
  | AgentPresetPayload
  | HookBridgePayload

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/
const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/

/** Reject a payload that cannot describe an installable artifact of its kind. */
export function assertPayloadMatchesKind(
  kind: ArtifactKind,
  payload: ArtifactPayload,
): asserts payload is ArtifactPayload {
  if (kind !== payload.kind) {
    throw DomainError.invalid('Artifact payload does not match the artifact kind.', {
      kind,
      payloadKind: payload.kind,
    })
  }

  switch (payload.kind) {
    case 'profile':
      if (payload.bundles.length === 0) {
        throw DomainError.invalid('A profile must stack at least one bundle.')
      }
      return
    case 'skill':
      if (payload.files.length === 0) {
        throw DomainError.invalid('A skill must ship at least one file.')
      }
      if (payload.layout === 'flat' && payload.files.length !== 1) {
        throw DomainError.invalid('A flat skill is exactly one Markdown file.', {
          files: payload.files.length,
        })
      }
      if (
        payload.layout === 'directory' &&
        !payload.files.some((file) => file.path === 'SKILL.md')
      ) {
        throw DomainError.invalid('A directory skill must ship a SKILL.md at its root.')
      }
      return
    case 'mcp-server': {
      if (!SERVER_NAME.test(payload.serverName)) {
        throw DomainError.invalid('An MCP server name must match [A-Za-z0-9_-]{1,32}.', {
          serverName: payload.serverName,
        })
      }
      if (payload.transport === 'stdio' && (payload.command ?? '') === '') {
        throw DomainError.invalid('A stdio MCP server needs a command.')
      }
      if (payload.transport === 'streamable-http' && (payload.url ?? '') === '') {
        throw DomainError.invalid('A streamable-http MCP server needs a url.')
      }
      const bad = payload.credentials.find((entry) => !ENV_NAME.test(entry.envName))
      if (bad) {
        throw DomainError.invalid('A credential reference must be a POSIX shell identifier.', {
          envName: bad.envName,
        })
      }
      return
    }
    case 'agent-preset':
      if (!/^[a-z0-9][a-z0-9-]*$/.test(payload.presetId)) {
        throw DomainError.invalid('An agent preset id must match [a-z0-9][a-z0-9-]*.', {
          presetId: payload.presetId,
        })
      }
      return
    case 'bundle':
    case 'hook-bridge':
      return
  }
}
