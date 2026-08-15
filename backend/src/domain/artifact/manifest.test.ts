import { describe, expect, it } from 'vitest'
import { classifyPackage, parseSkillFrontmatter } from './manifest.js'
import { DomainError } from '../shared/error.js'

describe('classifyPackage', () => {
  it('ignores a package with no dsh manifest', () => {
    // The harness activates no layer for such a package — it is a library other
    // plugins import — so listing it would put an uninstallable row in the catalog.
    expect(classifyPackage({ name: 'left-pad', version: '1.0.0' }, false)).toBeUndefined()
  })

  it('reads a bundle from dsh.bundle', () => {
    const result = classifyPackage(
      {
        name: 'dsh-hello-plugin',
        version: '0.1.0',
        dsh: { bundle: { patch: './cordis.patch.yml' } },
      },
      false,
    )

    expect(result).toEqual({
      kind: 'bundle',
      payload: { kind: 'bundle', patchPath: './cordis.patch.yml', requiresBuild: false },
    })
  })

  it('flags a build allowance only for a git install that has a build lifecycle', () => {
    const manifest = {
      name: 'dsh-ts-plugin',
      version: '0.1.0',
      scripts: { prepare: 'tsdown' },
      dsh: { bundle: {} },
    }

    // Published to npm: prebuilt, so no allowance is needed.
    expect(classifyPackage(manifest, false)?.payload).toMatchObject({ requiresBuild: false })
    // Installed from git: sources only, so pnpm must run `prepare`.
    expect(classifyPackage(manifest, true)?.payload).toMatchObject({ requiresBuild: true })
  })

  it('prefers a profile over a bundle when both are declared', () => {
    const result = classifyPackage(
      {
        name: 'dsh-my-setup',
        version: '1.0.0',
        dsh: {
          bundle: { patch: './cordis.patch.yml' },
          profile: { bundles: ['@deepseek-ai/dsh-base', 'dsh-hello-plugin'] },
        },
      },
      false,
    )

    expect(result?.kind).toBe('profile')
  })
})

describe('parseSkillFrontmatter', () => {
  it('accepts kebab-case names with a description', () => {
    expect(parseSkillFrontmatter({ name: 'release-notes', description: 'Draft notes.' })).toEqual({
      name: 'release-notes',
      description: 'Draft notes.',
    })
  })

  it('rejects a non-kebab-case name', () => {
    // The filesystem provider drops such a skill entirely, so the catalog must
    // not advertise it as installable.
    expect(() => parseSkillFrontmatter({ name: 'ReleaseNotes', description: 'x' })).toThrow(
      DomainError,
    )
  })

  it('rejects a missing description', () => {
    expect(() => parseSkillFrontmatter({ name: 'release-notes' })).toThrow(DomainError)
  })
})
