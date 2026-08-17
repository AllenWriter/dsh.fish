import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  listLocked,
  lockKey,
  readLock,
  removeLocked,
  upsertLocked,
  type LockedArtifact,
} from './lockfile.js'

function entry(overrides: Partial<LockedArtifact> = {}): LockedArtifact {
  return {
    artifactId: 'release-notes',
    kind: 'skill',
    profile: 'web',
    installedAt: '2026-01-01T00:00:00.000Z',
    files: ['skills/release-notes/SKILL.md'],
    rows: [],
    packages: [],
    ...overrides,
  }
}

describe('lockfile', () => {
  it('keys an install by profile and artifact, so the same skill can land twice', () => {
    expect(lockKey('web', 'notes')).toBe('web:notes')
    expect(lockKey('headless', 'notes')).toBe('headless:notes')
  })

  it('round-trips an entry and lists it under its profile', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-lock-'))
    await upsertLocked(entry(), home)
    await upsertLocked(entry({ artifactId: 'other', profile: 'headless' }), home)

    const lock = await readLock(home)
    expect(listLocked(lock, 'web').map((item) => item.artifactId)).toEqual(['release-notes'])
    expect(listLocked(lock).map((item) => `${item.profile}:${item.artifactId}`)).toEqual([
      'headless:other',
      'web:release-notes',
    ])

    const raw = await readFile(join(home, '.dsh-fish-lock.json'), 'utf8')
    expect(raw.endsWith('\n')).toBe(true)
  })

  it('removes one profile copy without touching another', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-lock-'))
    await upsertLocked(entry(), home)
    await upsertLocked(entry({ profile: 'headless' }), home)

    const removed = await removeLocked('web', 'release-notes', home)
    expect(removed?.profile).toBe('web')
    expect(listLocked(await readLock(home)).map((item) => item.profile)).toEqual(['headless'])
  })

  it('treats a missing or unreadable file as an empty lock', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-lock-'))
    expect(listLocked(await readLock(home))).toEqual([])
    expect(await removeLocked('web', 'missing', home)).toBeUndefined()
  })
})
