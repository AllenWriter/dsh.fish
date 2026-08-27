import { describe, expect, it } from 'vitest'
import { Artifact } from './artifact.js'
import type { ArtifactKind } from './artifact-kind.js'
import type { ArtifactPayload } from './artifact-payload.js'
import { buildInstallPlan, installTarget } from './install-plan.js'
import { githubSource, npmSource } from './source-ref.js'
import type { SourceRef } from './source-ref.js'
import { DomainError } from '../shared/error.js'

/**
 * `buildInstallPlan` is the one place that knows how each artifact kind reaches
 * a machine, and both the website and the CLI plugin consume its output. These
 * tests pin the per-kind mechanics, because a silent change here would make a
 * documented command and an automated install disagree.
 */

function artifact(
  kind: ArtifactKind,
  payload: ArtifactPayload,
  source: SourceRef = npmSource('dsh-example', '1.2.3'),
): Artifact {
  return Artifact.create({
    id: 'example',
    kind,
    displayName: 'Example',
    summary: 'An example artifact.',
    source,
    payload,
  })
}

const target = installTarget('web')

describe('buildInstallPlan', () => {
  it('exposes the scanned commit as plan provenance, when the row has one', () => {
    const sha = 'c0ffee'.padEnd(40, '0')
    const pinned = Artifact.create({
      id: 'example',
      kind: 'bundle',
      displayName: 'Example',
      summary: 'An example artifact.',
      source: githubSource({ owner: 'acme', repo: 'thing', commit: sha }),
      payload: { kind: 'bundle', requiresBuild: false },
      sourceCommitSha: sha,
    })

    expect(buildInstallPlan(pinned, target).scannedAtCommit).toBe(sha)
    // An npm row has no commit to vouch for; the field stays absent, not null.
    expect(
      buildInstallPlan(artifact('bundle', { kind: 'bundle', requiresBuild: false }), target)
        .scannedAtCommit,
    ).toBeUndefined()
  })

  it('installs an npm bundle at its pinned version', () => {
    const plan = buildInstallPlan(
      artifact('bundle', { kind: 'bundle', requiresBuild: false }),
      target,
    )

    expect(plan.steps).toEqual([
      {
        type: 'add-package',
        profile: 'web',
        spec: 'dsh-example@1.2.3',
        requiresBuildAllowance: false,
      },
    ])
    expect(plan.manualCommands).toEqual([
      'npx @dsh-fish/cli add example --profile web',
      'dsh plugin --profile web add dsh-example@1.2.3',
    ])
    expect(plan.warningKeys).toEqual([])
  })

  it('pins a git bundle to a commit and warns when one is missing', () => {
    const pinned = buildInstallPlan(
      artifact(
        'bundle',
        { kind: 'bundle', requiresBuild: true },
        githubSource({ owner: 'acme', repo: 'thing', commit: 'a'.repeat(40) }),
      ),
      target,
    )
    expect(pinned.manualCommands).toEqual([
      'npx @dsh-fish/cli add example --profile web',
      `dsh plugin --profile web add github:acme/thing#${'a'.repeat(40)}`,
    ])
    // A build allowance is permission to run code at install time, so it must
    // reach the user; an unpinned spec is a separate, additional warning.
    expect(pinned.warningKeys).toContain('install.warning.buildAllowance')
    expect(pinned.warningKeys).not.toContain('install.warning.unpinnedGitSpec')

    const unpinned = buildInstallPlan(
      artifact(
        'bundle',
        { kind: 'bundle', requiresBuild: false },
        githubSource({ owner: 'acme', repo: 'thing' }),
      ),
      target,
    )
    expect(unpinned.warningKeys).toContain('install.warning.unpinnedGitSpec')
  })

  it('adds every profile bundle in declared order', () => {
    const plan = buildInstallPlan(
      artifact('profile', {
        kind: 'profile',
        bundles: ['@deepseek-ai/dsh-base', 'dsh-hello-plugin'],
      }),
      target,
    )

    expect(plan.steps.map((step) => (step.type === 'add-package' ? step.spec : ''))).toEqual([
      '@deepseek-ai/dsh-base',
      'dsh-hello-plugin',
    ])
    expect(plan.warningKeys).toContain('install.warning.profileOrder')
  })

  it('writes a directory skill under the skills root', () => {
    const plan = buildInstallPlan(
      artifact('skill', {
        kind: 'skill',
        skillName: 'release-notes',
        layout: 'directory',
        files: [{ path: 'SKILL.md', downloadUrl: 'https://example.test/SKILL.md' }],
      }),
      target,
    )

    expect(plan.steps).toEqual([
      {
        type: 'write-file',
        root: 'dsh-home',
        relativePath: 'skills/release-notes/SKILL.md',
        downloadUrl: 'https://example.test/SKILL.md',
      },
    ])
    expect(plan.manualCommands).toEqual(['npx @dsh-fish/cli add example --profile web'])
  })

  it('writes a flat skill as a single markdown file', () => {
    const plan = buildInstallPlan(
      artifact('skill', {
        kind: 'skill',
        skillName: 'quick-note',
        layout: 'flat',
        files: [{ path: 'quick-note.md', downloadUrl: 'https://example.test/quick-note.md' }],
      }),
      target,
    )

    expect(plan.steps[0]).toMatchObject({ relativePath: 'skills/quick-note.md' })
  })

  it('writes an agent preset to its composition path', () => {
    const plan = buildInstallPlan(
      artifact('agent-preset', {
        kind: 'agent-preset',
        presetId: 'reviewer',
        compositionUrl: 'https://example.test/agent.cordis.yml',
      }),
      target,
    )

    expect(plan.steps[0]).toMatchObject({
      relativePath: '.agent-presets/reviewer/agent.cordis.yml',
      root: 'dsh-home',
    })
  })

  it('refuses a bundle with no installable specifier', () => {
    const orphan = Artifact.create({
      id: 'orphan',
      kind: 'bundle',
      displayName: 'Orphan',
      summary: 'Has only a homepage.',
      source: { origin: 'submission', homepageUrl: 'https://example.test/' },
      payload: { kind: 'bundle', requiresBuild: false },
    })

    expect(() => buildInstallPlan(orphan, target)).toThrow(DomainError)
  })

  it('rejects a profile name that is not a safe directory name', () => {
    expect(() => installTarget('../escape')).toThrow(DomainError)
    expect(() => installTarget('Web')).not.toThrow()
    expect(installTarget('Web').profile).toBe('web')
  })
})
