import { DomainError } from '../shared/error.js'
import type { ArtifactKind } from './artifact-kind.js'

/**
 * The kind-specific facts an install needs, beyond the source reference.
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

export interface AgentPresetPayload {
  readonly kind: 'agent-preset'
  /** Preset id; becomes the directory name under `<dshHome>/.agent-presets`. */
  readonly presetId: string
  readonly compositionUrl: string
}

export type ArtifactPayload = BundlePayload | ProfilePayload | SkillPayload | AgentPresetPayload

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
    case 'agent-preset':
      if (!/^[a-z0-9][a-z0-9-]*$/.test(payload.presetId)) {
        throw DomainError.invalid('An agent preset id must match [a-z0-9][a-z0-9-]*.', {
          presetId: payload.presetId,
        })
      }
      return
    case 'bundle':
      return
  }
}
