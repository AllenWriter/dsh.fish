import { afterEach, describe, expect, it, vi } from 'vitest'
import { GitHubIndexer } from './github-indexer.js'
import type { SweepCursor } from './sweep-cursor.js'

/**
 * What the crawler costs, and what it reaches.
 *
 * Both are budget questions rather than taste. A Worker invocation may make
 * 1000 subrequests, and the `dsh-plugin` topic is mostly applications that
 * merely mention the harness — of the twenty most-starred repositories under
 * it, two are things the harness can load. So the sweep is asserted on two
 * axes: a repository that is not a plugin has to be cheap, and successive runs
 * have to move past the head of the search rather than re-reading it.
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

/**
 * A GitHub stood up out of stubs. Returns the recorded request URLs so a test
 * can assert on what was *not* fetched, which is where the cost lives.
 */
function stubGitHub(pages: Record<number, RepoStub[]>) {
  const calls: string[] = []
  const byRepo = new Map<string, RepoStub>()
  for (const repos of Object.values(pages)) {
    for (const repo of repos) byRepo.set(`${repo.owner}/${repo.name}`, repo)
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

    const search = url.match(/search\/repositories\?.*page=(\d+)/)
    if (search) {
      const page = Number(search[1])
      return Response.json({ items: (pages[page] ?? []).map(repoItem) })
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

function cursorAt(page: number): SweepCursor & { written: number[] } {
  const written: number[] = []
  return {
    written,
    read: async () => page,
    write: async (next: number) => {
      written.push(next)
    },
  }
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
      1: [{ owner: 'acme', name: 'a-web-app', files: { 'README.md': '# app' } }],
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
      1: [
        {
          owner: 'acme',
          name: 'pg-tools',
          topics: ['dsh-plugin'],
          files: { 'SKILL.md': SKILL_MD, 'README.md': '# pg-tools' },
        },
      ],
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
    })
  })

  it('stores an uploaded Social preview instead of the generated card', async () => {
    const custom =
      'https://repository-images.githubusercontent.com/70107786/4602445c-10a2-4903-a360-c96d70531f67'
    stubGitHub({
      1: [
        {
          owner: 'acme',
          name: 'pg-tools',
          ogImageUrl: custom,
          files: { 'SKILL.md': SKILL_MD },
        },
      ],
    })

    const [snapshot] = await new GitHubIndexer().discover(1)
    expect(snapshot?.ogImageUrl).toBe(custom)
  })

  it('stops at the caller\'s limit', async () => {
    const calls = stubGitHub({
      1: [
        { owner: 'acme', name: 'one' },
        { owner: 'acme', name: 'two' },
      ],
    })

    await new GitHubIndexer().discover(1)

    expect(calls.some((url) => url.includes('/acme/two/'))).toBe(false)
  })

  it('resumes from the stored page and advances it', async () => {
    const cursor = cursorAt(3)
    const full = Array.from({ length: 100 }, (_, index) => ({ owner: 'acme', name: `r${index}` }))
    const calls = stubGitHub({ 3: full })

    await new GitHubIndexer(undefined, cursor).discover(1)

    expect(calls[0]).toContain('page=3')
    expect(cursor.written).toEqual([4])
  })

  it('wraps at the ceiling the search API imposes', async () => {
    // GitHub returns at most 1000 results, so page 11 would be empty forever.
    const cursor = cursorAt(10)
    const full = Array.from({ length: 100 }, (_, index) => ({ owner: 'acme', name: `r${index}` }))
    stubGitHub({ 10: full })

    await new GitHubIndexer(undefined, cursor).discover(1)

    expect(cursor.written).toEqual([1])
  })

  it('returns to the front once the result set runs out', async () => {
    const cursor = cursorAt(2)
    stubGitHub({ 2: [{ owner: 'acme', name: 'only' }] })

    await new GitHubIndexer(undefined, cursor).discover(50)

    expect(cursor.written).toEqual([1])
  })

  it('starts over rather than failing when the stored page is nonsense', async () => {
    const cursor = { ...cursorAt(0), read: async () => 99 }
    const calls = stubGitHub({ 1: [{ owner: 'acme', name: 'only' }] })

    await new GitHubIndexer(undefined, cursor).discover(1)

    expect(calls[0]).toContain('page=1')
  })
})

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
