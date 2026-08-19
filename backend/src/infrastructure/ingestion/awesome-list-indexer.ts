import { githubRepoFromUrl } from '../../domain/artifact/source-ref.js'
import type {
  IndexedSnapshot,
  IndexRequest,
  SourceIndexer,
} from '../../application/port/source-indexer.js'
import type { ListCursor, ListPosition } from './list-cursor.js'
import { RepoProber } from './repo-prober.js'

/**
 * A machine-readable curated catalog of plugin repositories.
 *
 * `extract` pulls the GitHub URLs out of the list's own JSON shape; everything
 * after that — repository metadata, manifest probes, classification — is the
 * shared `RepoProber`, so a listed repository is held to exactly the standard
 * a topic-tagged one is.
 */
export interface AwesomeList {
  /** Short id recorded in `source.via` for everything this list surfaces. */
  readonly id: string
  readonly url: string
  readonly extract: (body: unknown) => readonly string[]
}

/** Pull one string field out of each entry of a JSON array, tolerating junk. */
function urlsOf(body: unknown, key: 'plugins' | 'items'): readonly string[] {
  const entries = (body as Record<string, unknown> | null)?.[key]
  if (!Array.isArray(entries)) return []
  return entries.flatMap((entry) => {
    const url = (entry as Record<string, unknown> | null)?.url
    return typeof url === 'string' ? [url] : []
  })
}

/**
 * The curated lists the sweep aggregates. Both are community-maintained,
 * regenerated on a schedule, and stable in shape:
 *
 * - `awesome-dsh-plugin` — the catalog behind awesome-dsh-plugin.com, kept in
 *   the list repository itself.
 * - `oh-my-dsh` — Oh-My-DSH's full scan. It deliberately lists applications
 *   and collections alongside plugins; the manifest gate, not the list,
 *   decides what the registry carries.
 */
export const AWESOME_LISTS: readonly AwesomeList[] = [
  {
    id: 'awesome-dsh-plugin',
    url: 'https://raw.githubusercontent.com/beancookie/awesome-dsh-plugin/main/docs/plugins.json',
    extract: (body) => urlsOf(body, 'plugins'),
  },
  {
    id: 'oh-my-dsh',
    url: 'https://raw.githubusercontent.com/like-study1/Oh-My-DSH/main/data/plugins.json',
    extract: (body) => urlsOf(body, 'items'),
  },
]

/**
 * Discovers artifacts from curated awesome lists.
 *
 * The topic tag only reaches authors who knew to add it; the community's
 * curated lists catch the quality plugins that never tagged themselves. A
 * list entry is a *candidate*, not an artifact: the repository is probed for
 * a loadable manifest through the same pipeline the topic crawl uses, and a
 * listed repository without one is skipped exactly like a topic repository
 * is. Provenance is recorded on the artifact's source as `via`, so a row the
 * list surfaced keeps saying so after later crawls refresh it.
 */
export class AwesomeListIndexer implements SourceIndexer {
  readonly origin = 'awesome-list' as const

  constructor(
    private readonly prober: RepoProber,
    private readonly cursor?: ListCursor,
    private readonly lists: readonly AwesomeList[] = AWESOME_LISTS,
  ) {}

  /**
   * Probe one slice of the lists, resuming where the last run stopped.
   *
   * Each run fetches the list its cursor points at — one subrequest — and
   * probes candidates until the budget is spent, then records the offset so
   * the next run continues down the list instead of re-reading its head.
   * Reaching the end of a list moves the cursor to the next one; wrapping
   * past the last list is how listed rows get their stars and readme
   * refreshed.
   */
  async discover(limit: number): Promise<readonly IndexedSnapshot[]> {
    const snapshots: IndexedSnapshot[] = []
    if (this.lists.length === 0 || limit <= 0) return snapshots

    // The working copy of the cursor position; the stored shape stays immutable.
    const position: { list: number; offset: number } = await this.readCursor()
    let scanned = 0
    let listsRead = 0

    while (scanned < limit && listsRead < this.lists.length) {
      const list = this.lists[position.list % this.lists.length]!
      const urls = await this.fetchList(list)
      if (urls === undefined) {
        // The list is unreachable: stop here and leave the cursor untouched,
        // so the next run resumes this slice instead of losing it.
        break
      }
      listsRead += 1

      const seen = new Set<string>()
      let offset = Math.min(position.offset, urls.length)
      while (offset < urls.length && scanned < limit) {
        const candidate = githubRepoFromUrl(urls[offset]!)
        offset += 1
        if (candidate === undefined) continue
        const key = `${candidate.owner}/${candidate.repo}`.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        scanned += 1
        try {
          const snapshot = await this.indexCandidate(candidate.owner, candidate.repo, list.id)
          if (snapshot) snapshots.push(snapshot)
        } catch {
          // One unreadable repository never fails the sweep.
        }
      }

      position.offset = offset
      if (offset >= urls.length) {
        position.list = (position.list + 1) % this.lists.length
        position.offset = 0
      }
    }

    if (listsRead > 0) await this.writeCursor(position)
    return snapshots
  }

  async indexOne(request: IndexRequest): Promise<IndexedSnapshot | undefined> {
    const source = request.source
    if (source.origin !== 'github') return undefined
    const repo = await this.prober.fetchRepo(source.owner, source.repo)
    if (!repo) return undefined
    return this.prober.indexRepository(repo, source.path, request.kindHint)
  }

  private async indexCandidate(
    owner: string,
    repo: string,
    listId: string,
  ): Promise<IndexedSnapshot | undefined> {
    const descriptor = await this.prober.fetchRepo(owner, repo)
    if (!descriptor) return undefined
    const snapshot = await this.prober.indexRepository(descriptor)
    if (snapshot === undefined || snapshot.source.origin !== 'github') return snapshot
    return { ...snapshot, source: { ...snapshot.source, via: [listId] } }
  }

  private async fetchList(list: AwesomeList): Promise<readonly string[] | undefined> {
    try {
      const response = await fetch(list.url, {
        headers: { accept: 'application/json', 'user-agent': 'dsh.fish-indexer' },
      })
      if (!response.ok) return undefined
      return list.extract(await response.json())
    } catch {
      return undefined
    }
  }

  private async readCursor(): Promise<ListPosition> {
    const fresh: ListPosition = { list: 0, offset: 0 }
    if (!this.cursor) return fresh
    try {
      const stored = await this.cursor.read()
      if (stored === undefined) return fresh
      return {
        list: Math.min(stored.list, this.lists.length - 1),
        offset: stored.offset,
      }
    } catch {
      // A cursor read that fails costs coverage, not correctness.
      return fresh
    }
  }

  private async writeCursor(position: ListPosition): Promise<void> {
    if (!this.cursor) return
    try {
      await this.cursor.write(position)
    } catch {
      // The next run repeats this slice instead of advancing. Harmless: the
      // crawl is idempotent.
    }
  }
}
