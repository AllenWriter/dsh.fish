import { DomainError } from '../shared/error.js'
import { artifactKind, isRetiredArtifactKind } from './artifact-kind.js'
import type { ArtifactKind } from './artifact-kind.js'
import type { ArtifactPayload } from './artifact-payload.js'

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
   * may never contradict what the harness itself would load. `kind` naming a
   * content-proven kind (`bundle`, `profile`) without that proof is an error.
   * `mcp` / `hook` blocks are ignored: the catalog does not list those kinds.
   */
  readonly hub?: {
    readonly kind?: string
    readonly categories?: readonly string[]
    readonly mcp?: unknown
    readonly skill?: unknown
    readonly preset?: unknown
    readonly hook?: unknown
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
 * Classify a package from its `dsh.hub` declaration.
 *
 * `skill` and `agent-preset` declared here classify nothing: they are proven by
 * file probes (`SKILL.md`, `agent.cordis.yml`), which the manifest cannot see.
 * Retired kinds (`mcp-server`, `hook-bridge`) and leftover `hub.mcp` / `hub.hook`
 * blocks also classify nothing — the catalog does not list them.
 *
 * A `hub.kind` naming a content-proven kind whose proof is absent is still an
 * error, so a submitter sees the contradiction rather than a silent skip.
 */
function classifyHubDeclaration(hub: NonNullable<DshManifest['hub']>): Classification | undefined {
  if (hub.kind !== undefined && isRetiredArtifactKind(hub.kind)) return undefined
  if (hub.kind === undefined) return undefined

  const declared = artifactKind(hub.kind)

  if (declared === 'bundle' || declared === 'profile') {
    throw DomainError.invalid(
      `dsh.hub.kind declares ${declared}, but the manifest has no dsh.${declared}.`,
      { kind: declared },
    )
  }

  return undefined
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
