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

  it('reads an mcp-server from dsh.hub.kind and dsh.hub.mcp', () => {
    const result = classifyPackage(
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
              args: ['-y', '@modelcontextprotocol/server-github'],
              credentials: [
                { envName: 'GITHUB_TOKEN', required: true, descriptionKey: 'cred.githubToken' },
              ],
            },
          },
        },
      },
      false,
    )

    expect(result).toEqual({
      kind: 'mcp-server',
      payload: {
        kind: 'mcp-server',
        serverName: 'github',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        credentials: [
          { envName: 'GITHUB_TOKEN', required: true, descriptionKey: 'cred.githubToken' },
        ],
      },
    })
  })

  it('reads a streamable-http mcp-server from dsh.hub.mcp alone', () => {
    // The block implies the kind; hub.kind is the explicit spelling of it.
    const result = classifyPackage(
      {
        name: 'dsh-remote-mcp',
        version: '0.1.0',
        dsh: {
          hub: { mcp: { serverName: 'search', transport: 'streamable-http', url: 'https://mcp.example.com' } },
        },
      },
      false,
    )

    expect(result?.kind).toBe('mcp-server')
    expect(result?.payload).toMatchObject({ transport: 'streamable-http', credentials: [] })
  })

  it.each(['claude-code', 'codex'] as const)('reads a %s hook-bridge from dsh.hub.hook', (dialect) => {
    const result = classifyPackage(
      {
        name: 'dsh-hooks',
        version: '0.1.0',
        dsh: {
          hub: { kind: 'hook-bridge', hook: { dialect, settingsPath: 'hooks/settings.json' } },
        },
      },
      false,
    )

    expect(result).toEqual({
      kind: 'hook-bridge',
      payload: { kind: 'hook-bridge', dialect, settingsPath: 'hooks/settings.json' },
    })
  })

  it('rejects an mcp-server declaration whose block fails the payload rules', () => {
    const malformed = [
      // A kind claim without its block.
      { kind: 'mcp-server' },
      // Server names feed model-facing tool names, so the shape is enforced.
      { kind: 'mcp-server', mcp: { serverName: 'not a name!', transport: 'stdio', command: 'x' } },
      // stdio spawns a process; without a command there is nothing to spawn.
      { kind: 'mcp-server', mcp: { serverName: 'github', transport: 'stdio' } },
      // An unknown transport cannot be written into a dsh-mcp-client row.
      { kind: 'mcp-server', mcp: { serverName: 'github', transport: 'sse' } },
      // A credential reference must be a POSIX shell identifier.
      {
        kind: 'mcp-server',
        mcp: {
          serverName: 'github',
          transport: 'streamable-http',
          url: 'https://mcp.example.com',
          credentials: [{ envName: '1TOKEN', required: true }],
        },
      },
    ]

    for (const hub of malformed) {
      expect(() =>
        classifyPackage({ name: 'dsh-bad-mcp', version: '0.1.0', dsh: { hub } }, false),
      ).toThrow(DomainError)
    }
  })

  it('rejects a hook-bridge declaration with a bad dialect or escaping path', () => {
    const malformed = [
      { kind: 'hook-bridge' },
      { kind: 'hook-bridge', hook: { dialect: 'gemini', settingsPath: 'settings.json' } },
      // The path is read from disk at install time; it must stay inside the repository.
      { kind: 'hook-bridge', hook: { dialect: 'codex', settingsPath: '/etc/hooks.json' } },
      { kind: 'hook-bridge', hook: { dialect: 'codex', settingsPath: '../outside.json' } },
      { kind: 'hook-bridge', hook: { dialect: 'codex', settingsPath: ' ' } },
    ]

    for (const hub of malformed) {
      expect(() =>
        classifyPackage({ name: 'dsh-bad-hooks', version: '0.1.0', dsh: { hub } }, false),
      ).toThrow(DomainError)
    }
  })

  it('rejects a hub.kind outside the six artifact kinds', () => {
    expect(() =>
      classifyPackage(
        { name: 'dsh-bad-kind', version: '0.1.0', dsh: { hub: { kind: 'widget' } } },
        false,
      ),
    ).toThrow(DomainError)
  })

  it('rejects a kind claim that contradicts the declaration block present', () => {
    expect(() =>
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
    ).toThrow(DomainError)
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
