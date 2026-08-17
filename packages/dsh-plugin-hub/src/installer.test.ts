import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { HubClient, InstallPlan, InstallStep } from './hub-client.js'
import { InstallRefused, PlanInstaller, packageNameFromSpec } from './installer.js'
import { listLocked, readLock } from './lockfile.js'

function plan(overrides: Partial<InstallPlan> & { steps: InstallStep[] }): InstallPlan {
  return {
    artifactId: 'example',
    kind: 'skill',
    profile: 'web',
    manualCommands: [],
    warningKeys: [],
    ...overrides,
  }
}

function client(): HubClient {
  return {} as HubClient
}

describe('packageNameFromSpec', () => {
  it('keeps the scope on a versioned npm name', () => {
    expect(packageNameFromSpec('@acme/thing@1.2.3')).toBe('@acme/thing')
    expect(packageNameFromSpec('thing@1.2.3')).toBe('thing')
  })

  it('uses the repo name of a git spec', () => {
    expect(packageNameFromSpec(`github:acme/thing#${'a'.repeat(40)}`)).toBe('thing')
  })
})

describe('PlanInstaller', () => {
  it('writes skill files under $DSH_HOME and records them in the lockfile', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-install-'))
    const installer = new PlanInstaller(client(), 'web', {
      home,
      fetchText: async () => '---\nname: notes\ndescription: x\n---\n',
    })

    const outcome = await installer.apply(
      plan({
        steps: [
          {
            type: 'write-file',
            root: 'dsh-home',
            relativePath: 'skills/notes/SKILL.md',
            downloadUrl: 'https://example.test/SKILL.md',
          },
        ],
      }),
      { allowBuildScripts: false, signal: new AbortController().signal },
    )

    expect(outcome.steps[0]).toMatchObject({ applied: true, summary: 'Wrote skills/notes/SKILL.md' })
    expect(await readFile(join(home, 'skills/notes/SKILL.md'), 'utf8')).toContain('name: notes')

    const locked = listLocked(await readLock(home), 'web')
    expect(locked).toHaveLength(1)
    expect(locked[0]?.files).toEqual(['skills/notes/SKILL.md'])
  })

  it('refuses a write that escapes $DSH_HOME', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-install-'))
    const installer = new PlanInstaller(client(), 'web', {
      home,
      fetchText: async () => 'nope',
    })

    await expect(
      installer.apply(
        plan({
          steps: [
            {
              type: 'write-file',
              root: 'dsh-home',
              relativePath: '../outside.md',
              downloadUrl: 'https://example.test/x',
            },
          ],
        }),
        { allowBuildScripts: false, signal: new AbortController().signal },
      ),
    ).rejects.toMatchObject({ code: 'PATH_ESCAPE' })
  })

  it('refuses a build-allowance plan until the caller opts in', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-install-'))
    const installer = new PlanInstaller(client(), 'web', { home })

    await expect(
      installer.apply(
        plan({
          kind: 'bundle',
          steps: [
            {
              type: 'add-package',
              profile: 'web',
              spec: 'github:acme/thing',
              requiresBuildAllowance: true,
            },
          ],
        }),
        { allowBuildScripts: false, signal: new AbortController().signal },
      ),
    ).rejects.toBeInstanceOf(InstallRefused)
  })

  it('appends a marked patch row and can replace or remove it', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-install-'))
    const installer = new PlanInstaller(client(), 'web', { home })
    const row: InstallStep = {
      type: 'patch-row',
      profile: 'web',
      rowId: 'mcp-github',
      rowYaml: '- id: mcp-github\n  name: test',
    }

    await installer.apply(plan({ kind: 'mcp-server', artifactId: 'github-mcp', steps: [row] }), {
      allowBuildScripts: false,
      signal: new AbortController().signal,
    })

    const first = await readFile(join(home, 'profiles/web/cordis.patch.yml'), 'utf8')
    expect(first).toContain('# dsh-hub:mcp-github')
    expect(first).toContain('name: test')

    const skipped = await installer.apply(
      plan({ kind: 'mcp-server', artifactId: 'github-mcp', steps: [row] }),
      { allowBuildScripts: false, signal: new AbortController().signal },
    )
    expect(skipped.steps[0]?.applied).toBe(false)

    const replacedRow: InstallStep = { ...row, rowYaml: '- id: mcp-github\n  name: updated' }
    await installer.apply(
      plan({ kind: 'mcp-server', artifactId: 'github-mcp', steps: [replacedRow] }),
      { allowBuildScripts: false, signal: new AbortController().signal, replaceExisting: true },
    )
    const replaced = await readFile(join(home, 'profiles/web/cordis.patch.yml'), 'utf8')
    expect(replaced).toContain('name: updated')
    expect(replaced.match(/# dsh-hub:mcp-github/g)).toHaveLength(1)

    const removed = await installer.remove('github-mcp', {
      signal: new AbortController().signal,
    })
    expect(removed.steps.some((step) => step.summary.includes('Removed row'))).toBe(true)
    expect(await readFile(join(home, 'profiles/web/cordis.patch.yml'), 'utf8')).not.toContain(
      'mcp-github',
    )
    expect(listLocked(await readLock(home), 'web')).toEqual([])
  })

  it('runs dsh plugin add and records the new dependency name', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-install-'))
    await mkdir(join(home, 'profiles/web'), { recursive: true })
    await writeFile(
      join(home, 'profiles/web/package.json'),
      JSON.stringify({ dependencies: { '@deepseek-ai/dsh-base': '1.0.0' } }),
    )

    const calls: string[][] = []
    const installer = new PlanInstaller(client(), 'web', {
      home,
      run: async (_file, args) => {
        calls.push([...args])
        if (args[3] === 'add') {
          await writeFile(
            join(home, 'profiles/web/package.json'),
            JSON.stringify({
              dependencies: {
                '@deepseek-ai/dsh-base': '1.0.0',
                'dsh-hello': '1.2.3',
              },
            }),
          )
        }
        return { stdout: 'ok', stderr: '' }
      },
    })

    await installer.apply(
      plan({
        kind: 'bundle',
        steps: [
          {
            type: 'add-package',
            profile: 'web',
            spec: 'dsh-hello@1.2.3',
            requiresBuildAllowance: false,
          },
        ],
      }),
      { allowBuildScripts: false, signal: new AbortController().signal },
    )

    expect(calls[0]).toEqual(['plugin', '--profile', 'web', 'add', 'dsh-hello@1.2.3'])
    expect(listLocked(await readLock(home), 'web')[0]?.packages).toEqual([
      { spec: 'dsh-hello@1.2.3', name: 'dsh-hello' },
    ])

    const removed = await installer.remove('example', {
      signal: new AbortController().signal,
    })
    expect(removed.steps[0]?.summary).toBe('dsh plugin --profile web remove dsh-hello')
  })

  it('refuses remove when the lockfile has no matching row', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-install-'))
    const installer = new PlanInstaller(client(), 'web', { home })
    await expect(
      installer.remove('missing', { signal: new AbortController().signal }),
    ).rejects.toMatchObject({ code: 'NOT_INSTALLED' })
  })
})
