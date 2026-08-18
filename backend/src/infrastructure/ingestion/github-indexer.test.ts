import { afterEach, describe, expect, it, vi } from 'vitest'
import { GitHubIndexer, shardQuery, splitShard } from './github-indexer.js'
import type { ShardRange, SweepCursor, SweepPosition } from './sweep-cursor.js'

/**
 * What the crawler costs, and what it reaches.
 *
 * Both are budget questions rather than taste. A Worker invocation may make
 * 1000 subrequests, and the `dsh-plugin` topic is mostly applications that
 * merely mention the harness — of the twenty most-starred repositories under
 * it, two are things the harness can load. So the sweep is asserted on two
 * axes: a repository that is not a plugin has to be cheap, and successive runs
 * have to walk the shards past the search API's 1000-result ceiling rather
 * than re-reading the head.
 */

interface RepoStub {
  owner: string
  name: string
  description?: string
  topics?: string[]
  files?: Record<string, string>
  ogImageUrl?: string
}

function repoItem(repo: RepoStub) {
  return {
    full_name: `${repo.owner}/${repo.name}`,
    name: repo.name,
    owner: {
      login: repo.owner,
      html_url: `https://github.com/${repo.owner}`,
      avatar_url: '',
    },
    description: repo.description ?? null,
    stargazers_count: 7,
    license: null,
    topics: repo.topics ?? ['dsh-plugin'],
    default_branch: 'main',
    pushed_at: '2026-01-01T00:00:00Z',
    archived: false,
  }
}

/** The first shard of the default plan, where cursor-less runs start. */
const STARS_0 = 'topic:dsh-plugin stars:0'

function fullPage(prefix: string): RepoStub[] {
  return Array.from({ length: 100 }, (_, index) => ({ owner: prefix, name: `r${index}` }))
}

/**
 * A GitHub stood up out of stubs, keyed by search query and page. Returns the
 * recorded request URLs so a test can assert on what was *not* fetched, which
 * is where the cost lives.
 */
function stubGitHub(pages: Record<string, Record<number, RepoStub[]>>, searchStatus = 200) {
  const calls: string[] = []
  const byRepo = new Map<string, RepoStub>()
  for (const byPage of Object.values(pages)) {
    for (const repos of Object.values(byPage)) {
      for (const repo of repos) byRepo.set(`${repo.owner}/${repo.name}`, repo)
    }
  }

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    calls.push(url)

    if (url.includes('/graphql')) {
      const owner = graphqlOwner(init?.body)
      const repo = owner ? byRepo.get(owner) : undefined
      const custom = repo?.ogImageUrl
      if (custom) {
        return Response.json({
          data: {
            repository: { usesCustomOpenGraphImage: true, openGraphImageUrl: custom },
          },
        })
      }
      return Response.json({
        data: {
          repository: {
            usesCustomOpenGraphImage: false,
            openGraphImageUrl: 'https://avatars.githubusercontent.com/u/1',
          },
        },
      })
    }

    if (url.includes('/search/repositories')) {
      if (searchStatus !== 200) return new Response('rate limited', { status: searchStatus })
      const parsed = new URL(url)
      const query = parsed.searchParams.get('q') ?? ''
      const page = Number(parsed.searchParams.get('page'))
      return Response.json({ items: (pages[query]?.[page] ?? []).map(repoItem) })
    }

    const commit = url.match(/repos\/([^/]+)\/([^/]+)\/commits\//)
    if (commit) return Response.json({ sha: 'c0ffee'.padEnd(40, '0') })

    const raw = url.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/[^/]+\/(.+)$/)
    if (raw) {
      const body = byRepo.get(`${raw[1]}/${raw[2]}`)?.files?.[raw[3] ?? '']
      return body === undefined ? new Response('Not Found', { status: 404 }) : new Response(body)
    }

    return new Response('Not Found', { status: 404 })
  })

  return calls
}

function cursorAt(shards: ShardRange[], index: number, page: number) {
  const written: SweepPosition[] = []
  const cursor: SweepCursor & { written: SweepPosition[] } = {
    written,
    read: async () => ({ shards, index, page }),
    write: async (next: SweepPosition) => {
      written.push(next)
    },
  }
  return cursor
}

const SKILL_MD = `---
name: pg-schema-diff
description: Diff two postgres schemas and explain what changed.
---

# Body
`

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GitHubIndexer.discover', () => {
  it('yields nothing for a repository the harness could not load', async () => {
    const calls = stubGitHub({
      [STARS_0]: { 1: [{ owner: 'acme', name: 'a-web-app', files: { 'README.md': '# app' } }] },
    })

    const snapshots = await new GitHubIndexer().discover(1)

    expect(snapshots).toEqual([])
    // The three probes, and nothing else: no commit resolution, and not even
    // the readme that this repository does have.
    expect(calls.filter((url) => url.includes('raw.githubusercontent.com'))).toEqual([
      'https://raw.githubusercontent.com/acme/a-web-app/main/package.json',
      'https://raw.githubusercontent.com/acme/a-web-app/main/SKILL.md',
      'https://raw.githubusercontent.com/acme/a-web-app/main/agent.cordis.yml',
    ])
    expect(calls.some((url) => url.includes('/commits/'))).toBe(false)
  })

  it('indexes a skill and files it by its own description', async () => {
    stubGitHub({
      [STARS_0]: {
        1: [
          {
            owner: 'acme',
            name: 'pg-tools',
            topics: ['dsh-plugin'],
            files: { 'SKILL.md': SKILL_MD, 'README.md': '# pg-tools' },
          },
        ],
      },
    })

    const [snapshot] = await new GitHubIndexer().discover(1)

    expect(snapshot).toMatchObject({
      id: 'acme-pg-schema-diff',
      kind: 'skill',
      displayName: 'pg-schema-diff',
      // Nothing declared a category anywhere; before, this row landed with
      // none and no category filter could reach it.
      categories: ['data'],
      ogImageUrl: 'https://opengraph.githubassets.com/c0ffee0000000000000000000000000000000000/acme/pg-tools',
      // The resolved default-branch HEAD rides along as scan provenance; it
      // costs nothing extra because the OG lookup already resolved it.
      sourceCommitSha: 'c0ffee0000000000000000000000000000000000',
    })
  })

  it('stores an uploaded Social preview instead of the generated card', async () => {
    const custom =
      'https://repository-images.githubusercontent.com/70107786/4602445c-10a2-4903-a360-c96d70531f67'
    stubGitHub({
      [STARS_0]: {
        1: [
          {
            owner: 'acme',
            name: 'pg-tools',
            ogImageUrl: custom,
            files: { 'SKILL.md': SKILL_MD },
          },
        ],
      },
    })

    const [snapshot] = await new GitHubIndexer().discover(1)
    expect(snapshot?.ogImageUrl).toBe(custom)
  })

  it('stops at the caller\'s limit', async () => {
    const calls = stubGitHub({
      [STARS_0]: {
        1: [
          { owner: 'acme', name: 'one' },
          { owner: 'acme', name: 'two' },
        ],
      },
    })

    await new GitHubIndexer().discover(1)

    expect(calls.some((url) => url.includes('/acme/two/'))).toBe(false)
  })

  it('resumes from the stored shard and page, and advances past a full page', async () => {
    const shards: ShardRange[] = [{ min: 0, max: 0 }, { min: 1, max: 1 }]
    const cursor = cursorAt(shards, 0, 3)
    const calls = stubGitHub({ [STARS_0]: { 3: fullPage('acme') } })

    await new GitHubIndexer(undefined, cursor).discover(100)

    expect(calls[0]).toContain('page=3')
    expect(cursor.written).toEqual([{ shards, index: 0, page: 4 }])
  })

  it('stays on the page when the budget runs out mid-page', async () => {
    // Advancing here would skip the unread rest of the page for a whole cycle.
    const cursor = cursorAt([{ min: 0, max: 0 }], 0, 3)
    stubGitHub({ [STARS_0]: { 3: fullPage('acme') } })

    await new GitHubIndexer(undefined, cursor).discover(1)

    expect(cursor.written).toEqual([{ shards: [{ min: 0, max: 0 }], index: 0, page: 3 }])
  })

  it('moves on to the next shard when one runs out', async () => {
    const shards: ShardRange[] = [{ min: 0, max: 0 }, { min: 1, max: 1 }]
    const cursor = cursorAt(shards, 0, 1)
    const calls = stubGitHub({
      [STARS_0]: { 1: [{ owner: 'acme', name: 'zero-star' }] },
      'topic:dsh-plugin stars:1': { 1: fullPage('acme') },
    })

    await new GitHubIndexer(undefined, cursor).discover(2)

    const searches = calls.filter((url) => url.includes('/search/repositories'))
    expect(searches).toHaveLength(2)
    expect(decodeURIComponent(searches[0] ?? '')).toContain('stars:0')
    expect(decodeURIComponent(searches[1] ?? '')).toContain('stars:1')
    expect(cursor.written[0]).toMatchObject({ index: 1, page: 1 })
  })

  it('wraps to the first shard once every shard has been swept', async () => {
    const shards: ShardRange[] = [{ min: 0, max: 0 }, { min: 1, max: 1 }]
    const cursor = cursorAt(shards, 1, 1)
    stubGitHub({ 'topic:dsh-plugin stars:1': { 1: [{ owner: 'acme', name: 'only' }] } })

    await new GitHubIndexer(undefined, cursor).discover(50)

    expect(cursor.written).toEqual([{ shards, index: 0, page: 1 }])
  })

  it('splits a shard that fills the tenth page, then rereads the first half', async () => {
    // A full page 10 means the shard holds more than the 1000 the search API
    // will ever show; a single star value can only be halved by created date.
    const shards: ShardRange[] = [{ min: 0, max: 0 }, { min: 1, max: 1 }]
    const cursor = cursorAt(shards, 0, 10)
    stubGitHub({ [STARS_0]: { 10: fullPage('acme') } })

    await new GitHubIndexer(undefined, cursor).discover(100)

    const [position] = cursor.written
    expect(position?.index).toBe(0)
    expect(position?.page).toBe(1)
    expect(position?.shards).toHaveLength(3)
    const [lower, upper, rest] = position?.shards ?? []
    expect(lower).toMatchObject({ min: 0, max: 0, created: { from: '2008-01-01' } })
    expect(upper?.min).toBe(0)
    expect(upper?.created?.to).toBeUndefined()
    expect(upper?.created?.from).toBe(dayAfterIso(lower?.created?.to ?? ''))
    expect(rest).toEqual({ min: 1, max: 1 })
  })

  it('never probes a repository twice in one run', async () => {
    // `acme/dup` sits in two shards at once: it gained a star mid-sweep.
    const shards: ShardRange[] = [{ min: 0, max: 0 }, { min: 1, max: 1 }]
    const cursor = cursorAt(shards, 0, 1)
    const dup: RepoStub = { owner: 'acme', name: 'dup', files: { 'SKILL.md': SKILL_MD } }
    const calls = stubGitHub({
      [STARS_0]: { 1: [dup, ...fullPage('acme').slice(1)] },
      'topic:dsh-plugin stars:1': { 1: [dup, { owner: 'acme', name: 'fresh' }] },
    })

    const snapshots = await new GitHubIndexer(undefined, cursor).discover(150)

    expect(
      calls.filter((url) => url.includes('raw.githubusercontent.com/acme/dup/')),
    ).toEqual([
      'https://raw.githubusercontent.com/acme/dup/main/package.json',
      'https://raw.githubusercontent.com/acme/dup/main/SKILL.md',
      'https://raw.githubusercontent.com/acme/dup/main/README.md',
    ])
    expect(
      snapshots.filter(
        (snapshot) => snapshot.source.origin === 'github' && snapshot.source.repo === 'dup',
      ),
    ).toHaveLength(1)
  })

  it('leaves the cursor alone when the search API rate-limits', async () => {
    // A stalled run resumes the page it stalled on; moving the cursor here
    // would silently drop a slice of the topic.
    const shards: ShardRange[] = [{ min: 0, max: 0 }, { min: 1, max: 1 }]
    const cursor = cursorAt(shards, 1, 4)
    stubGitHub({}, 403)

    const snapshots = await new GitHubIndexer(undefined, cursor).discover(50)

    expect(snapshots).toEqual([])
    expect(cursor.written).toEqual([])
  })

  it('starts over rather than failing when the cursor cannot be read', async () => {
    const cursor: SweepCursor = {
      read: async () => {
        throw new Error('kv unavailable')
      },
      write: async () => {},
    }
    const calls = stubGitHub({ [STARS_0]: { 1: [{ owner: 'acme', name: 'only' }] } })

    await new GitHubIndexer(undefined, cursor).discover(1)

    expect(calls[0]).toContain('page=1')
    expect(decodeURIComponent(calls[0] ?? '')).toContain('stars:0')
  })
})

describe('shardQuery', () => {
  it('renders a single star value, a range, and an open floor', () => {
    expect(shardQuery({ min: 0, max: 0 })).toBe('topic:dsh-plugin stars:0')
    expect(shardQuery({ min: 3, max: 5 })).toBe('topic:dsh-plugin stars:3..5')
    expect(shardQuery({ min: 1001 })).toBe('topic:dsh-plugin stars:>=1001')
  })

  it('renders a created window, closed and open-ended', () => {
    expect(shardQuery({ min: 0, max: 0, created: { from: '2026-01-01', to: '2026-06-01' } })).toBe(
      'topic:dsh-plugin stars:0 created:2026-01-01..2026-06-01',
    )
    expect(shardQuery({ min: 0, max: 0, created: { from: '2026-06-02' } })).toBe(
      'topic:dsh-plugin stars:0 created:>=2026-06-02',
    )
  })
})

describe('splitShard', () => {
  it('halves a star range', () => {
    expect(splitShard({ min: 3, max: 5 }, '2026-08-18')).toEqual([
      { min: 3, max: 4 },
      { min: 5, max: 5 },
    ])
  })

  it('guesses a ceiling for an open-ended range', () => {
    expect(splitShard({ min: 1001 }, '2026-08-18')).toEqual([
      { min: 1001, max: 2002 },
      { min: 2003 },
    ])
  })

  it('falls back to created dates for a single star value', () => {
    const [lower, upper] = splitShard({ min: 0, max: 0 }, '2026-08-18') ?? []
    expect(lower).toMatchObject({ min: 0, max: 0, created: { from: '2008-01-01' } })
    expect(upper?.created?.from).toBe(dayAfterIso(lower?.created?.to ?? ''))
    // Open-ended, so repositories created after the split still land somewhere.
    expect(upper?.created?.to).toBeUndefined()
  })

  it('halves an existing created window and keeps it open-ended', () => {
    const [lower, upper] =
      splitShard({ min: 1, max: 1, created: { from: '2026-01-01' } }, '2026-08-18') ?? []
    expect(lower?.created?.from).toBe('2026-01-01')
    expect(upper?.created?.from).toBe(dayAfterIso(lower?.created?.to ?? ''))
    expect(upper?.created?.to).toBeUndefined()
  })

  it('gives up on one day at one star count', () => {
    expect(
      splitShard({ min: 0, max: 0, created: { from: '2026-01-01', to: '2026-01-01' } }, '2026-08-18'),
    ).toBeUndefined()
  })
})

function dayAfterIso(date: string): string {
  return new Date(Date.parse(date) + 86_400_000).toISOString().slice(0, 10)
}

function graphqlOwner(body: BodyInit | null | undefined): string | undefined {
  if (typeof body !== 'string') return undefined
  try {
    const parsed = JSON.parse(body) as { variables?: { owner?: string; name?: string } }
    const owner = parsed.variables?.owner
    const name = parsed.variables?.name
    return owner !== undefined && name !== undefined ? `${owner}/${name}` : undefined
  } catch {
    return undefined
  }
}
