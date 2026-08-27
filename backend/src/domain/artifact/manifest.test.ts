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

  it('does not classify retired mcp-server or hook-bridge hub declarations', () => {
    expect(
      classifyPackage(
        {
          name: 'dsh-github-mcp',
          version: '0.1.0',
          dsh: {
            hub: {
              kind: 'mcp-server',
              mcp: {
                serverName: 'github',
                transport: 'stdio',
                command: 'npx',
              },
            },
          },
        },
        false,
      ),
    ).toBeUndefined()

    expect(
      classifyPackage(
        {
          name: 'dsh-remote-mcp',
          version: '0.1.0',
          dsh: {
            hub: { mcp: { serverName: 'search', transport: 'streamable-http', url: 'https://mcp.example.com' } },
          },
        },
        false,
      ),
    ).toBeUndefined()

    expect(
      classifyPackage(
        {
          name: 'dsh-hooks',
          version: '0.1.0',
          dsh: {
            hub: { kind: 'hook-bridge', hook: { dialect: 'claude-code', settingsPath: 'hooks/settings.json' } },
          },
        },
        false,
      ),
    ).toBeUndefined()
  })

  it('rejects a hub.kind outside the catalog kinds', () => {
    expect(() =>
      classifyPackage(
        { name: 'dsh-bad-kind', version: '0.1.0', dsh: { hub: { kind: 'widget' } } },
        false,
      ),
    ).toThrow(DomainError)
  })

  it('does not treat leftover mcp and hook blocks as a contradiction', () => {
    expect(
      classifyPackage(
        {
          name: 'dsh-contradiction',
          version: '0.1.0',
          dsh: {
            hub: { kind: 'mcp-server', hook: { dialect: 'codex', settingsPath: 'settings.json' } },
          },
        },
        false,
      ),
    ).toBeUndefined()
  })

  it('rejects a hub.kind naming a content-proven kind whose proof is absent', () => {
    // `dsh.bundle` is missing, so the declaration is wrong, not just unproven.
    expect(() =>
      classifyPackage(
        { name: 'dsh-wrong-kind', version: '0.1.0', dsh: { hub: { kind: 'bundle' } } },
        false,
      ),
    ).toThrow(DomainError)
  })

  it('does not classify skill or agent-preset from hub.kind alone', () => {
    // Those kinds are proven by file probes the manifest cannot see.
    expect(
      classifyPackage(
        { name: 'dsh-hinted-skill', version: '0.1.0', dsh: { hub: { kind: 'skill' } } },
        false,
      ),
    ).toBeUndefined()
  })

  it('keeps advisory hub metadata from classifying anything', () => {
    expect(
      classifyPackage(
        { name: 'dsh-categories-only', version: '0.1.0', dsh: { hub: { categories: ['data'] } } },
        false,
      ),
    ).toBeUndefined()
  })

  it('lets content proof win over a contradicting hub declaration', () => {
    // A bundle with hub.kind 'mcp-server' is still a bundle: the harness would
    // load the dsh.bundle layer, and the row must match what installs.
    const result = classifyPackage(
      {
        name: 'dsh-bundle-with-hub',
        version: '0.1.0',
        dsh: { bundle: {}, hub: { kind: 'mcp-server', mcp: { serverName: 'x', transport: 'stdio', command: 'x' } } },
      },
      false,
    )

    expect(result?.kind).toBe('bundle')
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
