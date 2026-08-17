import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { dshHome } from './token-store.js'

export const LOCKFILE_VERSION = 1 as const

/**
 * One artifact the hub put on this machine.
 *
 * The lockfile is what makes `list` / `remove` / `update` possible: the install
 * plan says how to *add* something, but reversing a write or a patch row needs
 * a record of what this machine actually received.
 */
export interface LockedArtifact {
  readonly artifactId: string
  readonly kind: string
  readonly profile: string
  readonly installedAt: string
  /** Paths relative to `$DSH_HOME`, posix-separated. */
  readonly files: readonly string[]
  /** `cordis.patch.yml` row ids marked `# dsh-hub:<id>`. */
  readonly rows: readonly string[]
  /** Package-manager specs, with the dependency name `dsh plugin remove` needs. */
  readonly packages: readonly LockedPackage[]
}

export interface LockedPackage {
  readonly spec: string
  readonly name: string
}

export interface InstallLock {
  readonly version: typeof LOCKFILE_VERSION
  readonly artifacts: Record<string, LockedArtifact>
}

export function lockKey(profile: string, artifactId: string): string {
  return `${profile}:${artifactId}`
}

export function lockPath(home = dshHome()): string {
  return join(home, '.dsh-fish-lock.json')
}

export async function readLock(home = dshHome()): Promise<InstallLock> {
  try {
    const raw = await readFile(lockPath(home), 'utf8')
    const parsed = JSON.parse(raw) as InstallLock
    if (parsed.version !== LOCKFILE_VERSION || typeof parsed.artifacts !== 'object') {
      return emptyLock()
    }
    return parsed
  } catch {
    return emptyLock()
  }
}

export async function writeLock(lock: InstallLock, home = dshHome()): Promise<void> {
  const path = lockPath(home)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')
}

export async function upsertLocked(
  entry: LockedArtifact,
  home = dshHome(),
): Promise<void> {
  const lock = await readLock(home)
  const next: InstallLock = {
    version: LOCKFILE_VERSION,
    artifacts: {
      ...lock.artifacts,
      [lockKey(entry.profile, entry.artifactId)]: entry,
    },
  }
  await writeLock(next, home)
}

export async function removeLocked(
  profile: string,
  artifactId: string,
  home = dshHome(),
): Promise<LockedArtifact | undefined> {
  const lock = await readLock(home)
  const key = lockKey(profile, artifactId)
  const existing = lock.artifacts[key]
  if (existing === undefined) return undefined
  const { [key]: _removed, ...rest } = lock.artifacts
  await writeLock({ version: LOCKFILE_VERSION, artifacts: rest }, home)
  return existing
}

export function listLocked(
  lock: InstallLock,
  profile?: string,
): readonly LockedArtifact[] {
  const entries = Object.values(lock.artifacts)
  const filtered =
    profile === undefined ? entries : entries.filter((entry) => entry.profile === profile)
  return [...filtered].sort((a, b) => {
    const byProfile = a.profile.localeCompare(b.profile)
    return byProfile !== 0 ? byProfile : a.artifactId.localeCompare(b.artifactId)
  })
}

function emptyLock(): InstallLock {
  return { version: LOCKFILE_VERSION, artifacts: {} }
}
