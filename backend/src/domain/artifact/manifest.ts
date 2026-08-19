import { DomainError } from '../shared/error.js'
import { artifactKind } from './artifact-kind.js'
import type { ArtifactKind } from './artifact-kind.js'
import { assertPayloadMatchesKind } from './artifact-payload.js'
import type {
  ArtifactPayload,
  HookBridgePayload,
  McpServerPayload,
} from './artifact-payload.js'

/** The `dsh.hub.mcp` block: an MCP server's payload facts, declared in package.json. */
export interface HubMcpDeclaration {
  readonly serverName?: string
  readonly transport?: string
  readonly command?: string
  readonly args?: readonly string[]
  readonly url?: string
  readonly credentials?: readonly HubCredentialDeclaration[]
}

export interface HubCredentialDeclaration {
  readonly envName?: string
  readonly required?: boolean
  readonly descriptionKey?: string
}

/** The `dsh.hub.hook` block: a hook bridge's dialect and settings location. */
export interface HubHookDeclaration {
  readonly dialect?: string
  readonly settingsPath?: string
}

/**
 * The `dsh` manifest block a package may declare, as the harness reads it.
 *
 * `dsh.bundle.patch` marks a package as an installable bundle; `dsh.profile`
 * marks a runnable composition. A package with neither still installs, but only
 * as a plain dependency — the harness activates no layer for it, so the catalog
 * must not list it as a plugin either.
 */
export interface DshManifest {
  readonly bundle?: { readonly patch?: string }
  readonly profile?: { readonly bundles?: readonly string[] }
  /**
   * Optional hub metadata. `categories` is advisory: it may enrich a row but
   * may never contradict what the harness itself would load. `kind` with `mcp`
   * or `hook` is stronger — it is the declaration mechanism for the kinds the
   * harness has no native manifest convention for (an MCP server or hook bridge
   * installs as files and rows under `$DSH_HOME`, so the package.json
   * declaration is the only source of truth), and a declared-but-malformed
   * block is an error, not a miss.
   */
  readonly hub?: {
    readonly kind?: string
    readonly categories?: readonly string[]
    readonly mcp?: HubMcpDeclaration
    readonly skill?: unknown
    readonly preset?: unknown
    readonly hook?: HubHookDeclaration
  }
}

export interface PackageManifest {
  readonly name: string
  readonly version: string
  readonly description?: string
  readonly keywords?: readonly string[]
  readonly license?: string
  readonly scripts?: Readonly<Record<string, string>>
  readonly dsh?: DshManifest
}

export interface Classification {
  readonly kind: ArtifactKind
  readonly payload: ArtifactPayload
}

/**
 * Decide what a package is, from its manifest alone.
 *
 * Returns `undefined` for a package that declares no harness manifest: that is
 * a library other plugins import, not a plugin a user enables, and listing it
 * would put an uninstallable row in the catalog.
 */
export function classifyPackage(manifest: PackageManifest, isGitInstall: boolean): Classification | undefined {
  const dsh = manifest.dsh
  if (!dsh) return undefined

  if (dsh.profile?.bundles && dsh.profile.bundles.length > 0) {
    return {
      kind: 'profile',
      payload: { kind: 'profile', bundles: [...dsh.profile.bundles] },
    }
  }

  if (dsh.bundle) {
    return {
      kind: 'bundle',
      payload: {
        kind: 'bundle',
        ...(dsh.bundle.patch === undefined ? {} : { patchPath: dsh.bundle.patch }),
        // A git install fetches sources, not built artifacts: a package with a
        // `prepare` script needs a pnpm build allowance before it will load.
        requiresBuild: isGitInstall && hasBuildLifecycle(manifest),
      },
    }
  }

  if (dsh.hub) {
    return classifyHubDeclaration(dsh.hub)
  }

  return undefined
}

/**
 * Classify a package from its `dsh.hub` declaration — the source of truth for
 * the kinds the harness has no native manifest convention for.
 *
 * A declaration is a claim the package must be able to back: `kind: 'mcp-server'`
 * needs a well-formed `hub.mcp` block, `kind: 'hook-bridge'` a well-formed
 * `hub.hook` block, and either block on its own implies its kind. A claim that
 * does not hold together — a kind without its block, a block that cannot build
 * a valid payload, a `hub.kind` naming a content-proven kind whose proof is
 * absent — is a declared-but-malformed manifest and throws rather than being
 * skipped, so the sweep records it and the submitter sees it.
 *
 * `skill` and `agent-preset` declared here classify nothing: they are proven by
 * file probes (`SKILL.md`, `agent.cordis.yml`), which the manifest cannot see.
 */
function classifyHubDeclaration(hub: NonNullable<DshManifest['hub']>): Classification | undefined {
  // `artifactKind` rejects anything outside the six supported kinds.
  const declared = hub.kind === undefined ? undefined : artifactKind(hub.kind)

  if (declared === 'mcp-server') {
    return { kind: 'mcp-server', payload: mcpServerPayload(hub.mcp) }
  }
  if (declared === 'hook-bridge') {
    return { kind: 'hook-bridge', payload: hookBridgePayload(hub.hook) }
  }

  if (hub.mcp !== undefined || hub.hook !== undefined) {
    if (declared !== undefined) {
      throw DomainError.invalid(
        `dsh.hub.kind declares ${declared}, which the dsh.hub.mcp / dsh.hub.hook declaration contradicts.`,
        { kind: declared },
      )
    }
    if (hub.mcp !== undefined) {
      return { kind: 'mcp-server', payload: mcpServerPayload(hub.mcp) }
    }
    return { kind: 'hook-bridge', payload: hookBridgePayload(hub.hook) }
  }

  if (declared === 'bundle' || declared === 'profile') {
    // Reaching this point means the dsh.* block that proves the kind is absent.
    throw DomainError.invalid(
      `dsh.hub.kind declares ${declared}, but the manifest has no dsh.${declared}.`,
      { kind: declared },
    )
  }

  return undefined
}

/** Build an MCP server payload from its declaration; a malformed block throws. */
function mcpServerPayload(declaration: HubMcpDeclaration | undefined): McpServerPayload {
  if (declaration === undefined) {
    throw DomainError.invalid('An mcp-server declaration needs a dsh.hub.mcp block.')
  }
  const transport = declaration.transport
  if (transport !== 'stdio' && transport !== 'streamable-http') {
    throw DomainError.invalid('An MCP server transport must be stdio or streamable-http.', {
      transport,
    })
  }
  const payload: McpServerPayload = {
    kind: 'mcp-server',
    serverName: declaration.serverName ?? '',
    transport,
    ...(declaration.command === undefined ? {} : { command: declaration.command }),
    ...(declaration.args === undefined ? {} : { args: declaration.args }),
    ...(declaration.url === undefined ? {} : { url: declaration.url }),
    // Credentials are references, never values; an omitted `required` means the
    // variable is optional.
    credentials: (declaration.credentials ?? []).map((credential) => ({
      envName: credential.envName ?? '',
      required: credential.required ?? false,
      ...(credential.descriptionKey === undefined
        ? {}
        : { descriptionKey: credential.descriptionKey }),
    })),
  }
  assertPayloadMatchesKind('mcp-server', payload)
  return payload
}

/** Build a hook bridge payload from its declaration; a malformed block throws. */
function hookBridgePayload(declaration: HubHookDeclaration | undefined): HookBridgePayload {
  if (declaration === undefined) {
    throw DomainError.invalid('A hook-bridge declaration needs a dsh.hub.hook block.')
  }
  const dialect = declaration.dialect
  if (dialect !== 'claude-code' && dialect !== 'codex') {
    throw DomainError.invalid('A hook bridge dialect must be claude-code or codex.', { dialect })
  }
  const settingsPath = declaration.settingsPath
  if (settingsPath === undefined || settingsPath.trim() === '') {
    throw DomainError.invalid('A hook bridge needs a settingsPath.')
  }
  if (settingsPath.startsWith('/') || settingsPath.split('/').includes('..')) {
    throw DomainError.invalid(
      'A hook bridge settingsPath must be a relative path inside the repository.',
      { settingsPath },
    )
  }
  return { kind: 'hook-bridge', dialect, settingsPath }
}

function hasBuildLifecycle(manifest: PackageManifest): boolean {
  const scripts = manifest.scripts
  if (!scripts) return false
  return typeof scripts['prepare'] === 'string' || typeof scripts['build'] === 'string'
}

/** Frontmatter the skill provider requires: `name` and `description`, name kebab-case. */
export interface SkillFrontmatter {
  readonly name: string
  readonly description: string
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function parseSkillFrontmatter(raw: Readonly<Record<string, unknown>>): SkillFrontmatter {
  const name = typeof raw['name'] === 'string' ? raw['name'].trim() : ''
  const description = typeof raw['description'] === 'string' ? raw['description'].trim() : ''
  if (!KEBAB.test(name)) {
    throw DomainError.invalid('A skill name must be kebab-case.', { name })
  }
  if (description === '') {
    throw DomainError.invalid('A skill needs a description.', { name })
  }
  // `disable-model-invocation: true` hides a skill from model-facing catalogs.
  // Such a skill is still installable, so it stays in the registry; the flag is
  // presentation, not eligibility.
  return { name, description }
}
