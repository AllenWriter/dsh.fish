import { DomainError } from '../shared/error.js'
import type { Artifact } from './artifact.js'
import type { ArtifactKind } from './artifact-kind.js'
import { packageSpec } from './source-ref.js'

/**
 * Where an install writes. The hub never learns a machine's real paths: a step
 * names a *root* the client resolves locally (`$DSH_HOME`, or the profile
 * directory under it), plus a path relative to that root.
 */
export type PathRoot = 'dsh-home' | 'profile'

export interface InstallTarget {
  /** Profile name, e.g. `web`. `dsh plugin --profile <name> …` operates on it. */
  readonly profile: string
}

const PROFILE_NAME = /^[a-z0-9][a-z0-9-]*$/

export function installTarget(profile: string): InstallTarget {
  const value = profile.trim().toLowerCase()
  if (!PROFILE_NAME.test(value)) {
    throw DomainError.invalid('A profile name must match [a-z0-9][a-z0-9-]*.', { profile })
  }
  return { profile: value }
}

/** Install a package into the profile by forwarding to the package manager. */
export interface AddPackageStep {
  readonly type: 'add-package'
  readonly profile: string
  readonly spec: string
  /**
   * True when the package is a git spec that must run a build script. pnpm >=10
   * refuses that until the user allowlists it, and doing so is permission to
   * execute the package's code at install time, outside any sandbox.
   */
  readonly requiresBuildAllowance: boolean
}

/** Write a file fetched from the registry into a local root. */
export interface WriteFileStep {
  readonly type: 'write-file'
  readonly root: PathRoot
  readonly relativePath: string
  readonly downloadUrl: string
}

/** Append a plugin row to the profile's own `cordis.patch.yml` layer. */
export interface PatchRowStep {
  readonly type: 'patch-row'
  readonly profile: string
  /** Row id; re-running an install replaces the row with this id rather than duplicating it. */
  readonly rowId: string
  /** YAML fragment for one Cordis plugin row. */
  readonly rowYaml: string
}

/** Ask the user for a credential *reference*'s value before the artifact can run. */
export interface RequireCredentialStep {
  readonly type: 'require-credential'
  readonly envName: string
  readonly required: boolean
}

export type InstallStep = AddPackageStep | WriteFileStep | PatchRowStep | RequireCredentialStep

/** npm package name of the hub CLI. `npx` runs its `dsh-fish` bin. */
export const HUB_CLI_PACKAGE = '@dsh-fish/cli'

export function hubCliAddCommand(artifactId: string, profile: string): string {
  return `npx ${HUB_CLI_PACKAGE} add ${artifactId} --profile ${profile}`
}

export interface InstallPlan {
  readonly artifactId: string
  readonly kind: ArtifactKind
  readonly target: InstallTarget
  readonly steps: readonly InstallStep[]
  /**
   * Equivalent shell commands. The first is always `npx @dsh-fish/cli add …`,
   * which applies this plan. Native `dsh plugin add` lines follow for bundles.
   */
  readonly manualCommands: readonly string[]
  /** Things the user should read before running the plan. i18n keys, not prose. */
  readonly warningKeys: readonly string[]
}

/**
 * Domain service: turn one catalog row into the concrete steps that install it.
 *
 * This is the single place that knows how each artifact kind reaches a machine.
 * The website renders `manualCommands` from it; the `dsh-hub` plugin and the
 * `@dsh-fish/cli` binary execute `steps` from it. The first command is always
 * the hub CLI, so a copied line actually installs — kinds that the harness
 * launcher does not cover (skills, MCP rows, presets, hooks) used to ship only
 * a comment, which is not a command.
 */
export function buildInstallPlan(artifact: Artifact, target: InstallTarget): InstallPlan {
  const steps: InstallStep[] = []
  const manualCommands: string[] = [hubCliAddCommand(artifact.id, target.profile)]
  const warningKeys: string[] = []
  const payload = artifact.payload

  switch (payload.kind) {
    case 'bundle': {
      const spec = packageSpec(artifact.source)
      if (spec === undefined) {
        throw DomainError.unsupported('This bundle has no installable package specifier.', {
          artifactId: artifact.id,
        })
      }
      steps.push({
        type: 'add-package',
        profile: target.profile,
        spec,
        requiresBuildAllowance: payload.requiresBuild,
      })
      manualCommands.push(`dsh plugin --profile ${target.profile} add ${spec}`)
      if (payload.requiresBuild) {
        warningKeys.push('install.warning.buildAllowance')
      }
      if (artifact.source.origin === 'github' && artifact.source.commit === undefined) {
        warningKeys.push('install.warning.unpinnedGitSpec')
      }
      break
    }

    case 'profile': {
      // A profile is adopted bundle by bundle: `dsh plugin add` creates the
      // profile on first use with `@deepseek-ai/dsh-base` as its first bundle,
      // then appends each listed bundle in order.
      for (const bundleSpec of payload.bundles) {
        steps.push({
          type: 'add-package',
          profile: target.profile,
          spec: bundleSpec,
          requiresBuildAllowance: bundleSpec.startsWith('github:'),
        })
        manualCommands.push(`dsh plugin --profile ${target.profile} add ${bundleSpec}`)
      }
      warningKeys.push('install.warning.profileOrder')
      break
    }

    case 'skill': {
      // Skills are plain files under a skills root; no package manager involved.
      const base =
        payload.layout === 'directory' ? `skills/${payload.skillName}` : 'skills'
      for (const file of payload.files) {
        steps.push({
          type: 'write-file',
          root: 'dsh-home',
          relativePath:
            payload.layout === 'directory'
              ? `${base}/${file.path}`
              : `${base}/${payload.skillName}.md`,
          downloadUrl: file.downloadUrl,
        })
      }
      break
    }

    case 'mcp-server': {
      // One `dsh-mcp-client` plugin row per server, appended to the profile's
      // own patch layer so a later harness upgrade cannot clobber it.
      const rowId = `mcp-${payload.serverName}`
      steps.push({
        type: 'patch-row',
        profile: target.profile,
        rowId,
        rowYaml: mcpRowYaml(rowId, payload),
      })
      for (const credential of payload.credentials) {
        steps.push({
          type: 'require-credential',
          envName: credential.envName,
          required: credential.required,
        })
      }
      manualCommands.push(
        `# Add this row to $DSH_HOME/profiles/${target.profile}/cordis.patch.yml`,
        mcpRowYaml(rowId, payload),
      )
      if (payload.credentials.length > 0) {
        warningKeys.push('install.warning.credentialsNeeded')
      }
      break
    }

    case 'agent-preset': {
      steps.push({
        type: 'write-file',
        root: 'dsh-home',
        relativePath: `.agent-presets/${payload.presetId}/agent.cordis.yml`,
        downloadUrl: payload.compositionUrl,
      })
      manualCommands.push(
        `# Copy the composition to $DSH_HOME/.agent-presets/${payload.presetId}/agent.cordis.yml`,
      )
      break
    }

    case 'hook-bridge': {
      const bridgePackage =
        payload.dialect === 'claude-code'
          ? '@deepseek-ai/dsh-hooks-claude-code'
          : '@deepseek-ai/dsh-hooks-codex'
      const rowId = `hooks-${payload.dialect}`
      steps.push({
        type: 'patch-row',
        profile: target.profile,
        rowId,
        rowYaml: hookRowYaml(rowId, bridgePackage, payload.settingsPath),
      })
      manualCommands.push(
        `# Add this row to $DSH_HOME/profiles/${target.profile}/cordis.patch.yml`,
        hookRowYaml(rowId, bridgePackage, payload.settingsPath),
      )
      warningKeys.push('install.warning.hookExecutesShell')
      break
    }
  }

  return {
    artifactId: artifact.id,
    kind: artifact.kind,
    target,
    steps,
    manualCommands,
    warningKeys,
  }
}

function mcpRowYaml(rowId: string, payload: Extract<Artifact['payload'], { kind: 'mcp-server' }>): string {
  const lines = [`- id: ${rowId}`, `  name: '@deepseek-ai/dsh-mcp-client'`, '  config:']
  lines.push(`    serverName: ${payload.serverName}`)
  lines.push(`    transport: ${payload.transport}`)
  if (payload.transport === 'stdio') {
    lines.push(`    command: ${payload.command}`)
    if (payload.args && payload.args.length > 0) {
      lines.push(`    args: [${payload.args.map((arg) => JSON.stringify(arg)).join(', ')}]`)
    }
    if (payload.credentials.length > 0) {
      lines.push('    env:')
      for (const credential of payload.credentials) {
        // `!!js` resolves the reference at load time; the value never ships in config.
        lines.push(`      ${credential.envName}: !!js process.env.${credential.envName}`)
      }
    }
  } else {
    lines.push(`    url: ${payload.url}`)
    const bearer = payload.credentials[0]
    if (bearer) {
      lines.push('    headers:')
      lines.push(
        `      Authorization: !!js \`Bearer \${process.env.${bearer.envName}}\``,
      )
    }
  }
  return lines.join('\n')
}

function hookRowYaml(rowId: string, bridgePackage: string, settingsPath: string): string {
  return [
    `- id: ${rowId}`,
    `  name: '${bridgePackage}'`,
    '  config:',
    `    settingsPath: ${settingsPath}`,
  ].join('\n')
}
