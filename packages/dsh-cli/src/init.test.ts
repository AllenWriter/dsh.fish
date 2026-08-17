import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { initSkill } from './init.js'

describe('initSkill', () => {
  it('writes a SKILL.md the hub indexer can classify', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'dsh-init-'))
    const result = await initSkill(cwd, 'release-notes')
    expect(result.created).toBe(true)
    const text = await readFile(join(cwd, 'release-notes/SKILL.md'), 'utf8')
    expect(text).toMatch(/^---\nname: release-notes\ndescription: /)
  })

  it('does not overwrite an existing skill', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'dsh-init-'))
    await initSkill(cwd, 'notes')
    const second = await initSkill(cwd, 'notes')
    expect(second.created).toBe(false)
  })
})
