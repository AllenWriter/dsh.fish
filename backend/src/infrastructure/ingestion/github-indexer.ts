import type {
  IndexedSnapshot,
  IndexRequest,
  SourceIndexer,
} from '../../application/port/source-indexer.js'
import type { ShardRange, SweepCursor, SweepPosition } from './sweep-cursor.js'
import { GitHubSocialPreview } from './github-social-preview.js'
import { DSH_PLUGIN_TOPIC, RepoProber } from './repo-prober.js'
import type { RepoDescriptor } from './repo-prober.js'

export { DSH_PLUGIN_TOPIC }

const API = 'https://api.github.com'

/** GitHub's search API never returns more than this for one query, whatever the paging. */
const MAX_SEARCH_RESULTS = 1000
const PAGE_SIZE = 100
const MAX_PAGE = MAX_SEARCH_RESULTS / PAGE_SIZE

/**
 * The initial partition of the topic, sized against its real star distribution:
 * several thousand repositories, most of them barely starred. The fine
 * single-star shards at the bottom are where the long tail lives. A shard that
 * still saturates the search ceiling is split where it stands, so the plan
 * stays right as the topic grows.
 */
const DEFAULT_SHARDS: readonly ShardRange[] = [
  { min: 0, max: 0 },
  { min: 1, max: 1 },
  { min: 2, max: 2 },
  { min: 3, max: 5 },
  { min: 6, max: 10 },
  { min: 11, max: 20 },
  { min: 21, max: 50 },
  { min: 51, max: 200 },
  { min: 201, max: 1000 },
  { min: 1001 },
]

/** Nothing under the topic predates GitHub itself. */
const CREATED_EPOCH = '2008-01-01'
const DAY_MS = 86_400_000

/**
 * Discovers artifacts from GitHub.
 *
 * The harness has no registry of its own — its README simply asks authors to
 * tag repositories with the `dsh-plugin` topic. That topic is therefore the
 * closest thing to an authoritative source list, and this indexer treats it as
 * the seed set.
 *
 * Classification is the `RepoProber`'s job, shared with the curated-list
 * crawl: a repository is what it contains, not what it claims, so the three
 * manifest probes run before anything else is fetched, and a repository that
 * fails all three costs three reads of `raw.githubusercontent.com` and no API
 * quota at all.
 */
export class GitHubIndexer implements SourceIndexer {
  readonly origin = 'github' as const
  private readonly prober: RepoProber

  constructor(
    token?: string,
    private readonly cursor?: SweepCursor,
    socialPreview: GitHubSocialPreview = new GitHubSocialPreview(token),
  ) {
    this.prober = new RepoProber(token, socialPreview)
  }

  /**
   * Read one slice of the topic, resuming where the last run stopped.
   *
   * The search API caps any single query at 1000 results, and the topic is
   * several times that, so the crawl walks it shard by shard: star ranges that
   * each fit under the ceiling, split further — by created date once a star
   * range cannot be halved — the moment one proves too dense. The position is
   * what lets successive scheduled runs cover the whole topic instead of
   * re-reading the same well-known head forever; wrapping back to the first
   * shard is not wasted work, because the sweep is how existing rows get their
   * stars, summary and readme refreshed.
   */
  async discover(limit: number): Promise<readonly IndexedSnapshot[]> {
    const snapshots: IndexedSnapshot[] = []
    // Repositories drift between shards as their stars change mid-sweep; one
    // run never probes the same repository twice.
    const seen = new Set<string>()
    const position = await this.readCursor()
    let scanned = 0
    let pagesRead = 0

    while (scanned < limit) {
      const shard = position.shards[position.index] ?? position.shards[0]
      if (shard === undefined) break // An empty shard plan cannot make progress.
      const items = await this.searchPage(shard, position.page)
      if (items === undefined) {
        // Rate-limited or otherwise failed: stop here and leave the cursor
        // untouched, so the next run resumes this page instead of losing it.
        break
      }
      pagesRead += 1

      let examined = 0
      for (const item of items) {
        if (scanned >= limit) break
        examined += 1
        if (seen.has(item.full_name)) continue
        seen.add(item.full_name)
        scanned += 1
        try {
          const snapshot = await this.prober.indexRepository(item)
          if (snapshot) snapshots.push(snapshot)
        } catch {
          // One unreadable repository never fails the sweep.
        }
      }
      if (examined < items.length) {
        // The budget ran out mid-page: stay on this page so the rest of it is
        // read next run rather than skipped for a whole cycle.
        break
      }

      if (items.length < PAGE_SIZE) {
        // A short or empty page is the end of this shard, not of the topic.
        if (!advanceShard(position)) break
        continue
      }

      if (position.page >= MAX_PAGE) {
        // A full tenth page means the shard holds more than the ceiling will
        // ever show. Split it and reread the first half from page 1 next run.
        const halves = splitShard(shard, today())
        if (halves === undefined) {
          // One day at one star count over the ceiling: accept the loss.
          if (!advanceShard(position)) break
          continue
        }
        position.shards = [
          ...position.shards.slice(0, position.index),
          ...halves,
          ...position.shards.slice(position.index + 1),
        ]
        position.page = 1
        break
      }

      position.page += 1
    }

    if (pagesRead > 0) await this.writeCursor(position)
    return snapshots
  }

  async indexOne(request: IndexRequest): Promise<IndexedSnapshot | undefined> {
    const source = request.source
    if (source.origin !== 'github') return undefined
    const repo = await this.prober.fetchRepo(source.owner, source.repo)
    if (!repo) return undefined
    return this.prober.indexRepository(repo, source.path)
  }

  private async searchPage(
    shard: ShardRange,
    page: number,
  ): Promise<RepoDescriptor[] | undefined> {
    const url = `${API}/search/repositories?q=${encodeURIComponent(shardQuery(shard))}&sort=stars&order=desc&per_page=${PAGE_SIZE}&page=${page}`
    const response = await this.prober.get(url)
    if (!response) return undefined
    const body = (await response.json()) as { items?: RepoDescriptor[] }
    return body.items ?? []
  }

  private async readCursor(): Promise<MutablePosition> {
    const fresh = (): MutablePosition => ({ shards: [...DEFAULT_SHARDS], index: 0, page: 1 })
    if (!this.cursor) return fresh()
    try {
      const stored = await this.cursor.read()
      if (stored === undefined) return fresh()
      return {
        shards: [...stored.shards],
        index: Math.min(stored.index, stored.shards.length - 1),
        // A stored page past the search API's ceiling would return nothing forever.
        page: Math.min(Math.max(1, Math.floor(stored.page)), MAX_PAGE),
      }
    } catch {
      // A cursor read that fails costs coverage, not correctness.
      return fresh()
    }
  }

  private async writeCursor(position: SweepPosition): Promise<void> {
    if (!this.cursor) return
    try {
      await this.cursor.write(position)
    } catch {
      // The next run repeats this slice instead of advancing. Harmless: the
      // crawl is idempotent.
    }
  }
}

/** The working copy of a sweep position; the stored shape stays immutable. */
interface MutablePosition {
  shards: ShardRange[]
  index: number
  page: number
}

/** The query one shard issues. */
export function shardQuery(shard: ShardRange): string {
  const stars =
    shard.max === undefined
      ? `>=${shard.min}`
      : shard.max === shard.min
        ? `${shard.min}`
        : `${shard.min}..${shard.max}`
  const created =
    shard.created === undefined
      ? ''
      : shard.created.to === undefined
        ? ` created:>=${shard.created.from}`
        : ` created:${shard.created.from}..${shard.created.to}`
  return `topic:${DSH_PLUGIN_TOPIC} stars:${stars}${created}`
}

/**
 * Move to the next shard. Returns false when that was the last one: the whole
 * topic has been swept, and the cursor wraps to the first shard so the next
 * cycle refreshes the rows this one indexed.
 */
function advanceShard(position: MutablePosition): boolean {
  position.page = 1
  position.index += 1
  if (position.index >= position.shards.length) {
    position.index = 0
    return false
  }
  return true
}

/**
 * Halve a shard that returned a full tenth page — proof it holds more than the
 * search API will ever show. Star ranges halve by stars; a single star value
 * too dense for the ceiling falls back to created dates. Undefined when there
 * is nothing left to halve: one day at one star count.
 */
export function splitShard(shard: ShardRange, today: string): [ShardRange, ShardRange] | undefined {
  if (shard.created === undefined) {
    if (shard.max === undefined) {
      // Open-ended: guess a ceiling at double the floor.
      const ceiling = Math.max(shard.min * 2, shard.min + 1)
      return [{ min: shard.min, max: ceiling }, { min: ceiling + 1 }]
    }
    if (shard.min < shard.max) {
      const mid = Math.floor((shard.min + shard.max) / 2)
      return [{ min: shard.min, max: mid }, { min: mid + 1, max: shard.max }]
    }
    // The upper half stays open-ended so repositories created later still land.
    const mid = midpointDate(CREATED_EPOCH, today)
    return [
      { min: shard.min, max: shard.max, created: { from: CREATED_EPOCH, to: mid } },
      { min: shard.min, max: shard.max, created: { from: dayAfter(mid) } },
    ]
  }
  const { from } = shard.created
  const to = shard.created.to ?? today
  if (from >= to) return undefined
  const mid = midpointDate(from, to)
  return [
    { min: shard.min, max: shard.max ?? shard.min, created: { from, to: mid } },
    {
      min: shard.min,
      max: shard.max ?? shard.min,
      created: { from: dayAfter(mid), ...(shard.created.to === undefined ? {} : { to }) },
    },
  ]
}

function midpointDate(from: string, to: string): string {
  const mid = Date.parse(from) + Math.floor((Date.parse(to) - Date.parse(from)) / 2)
  return new Date(mid).toISOString().slice(0, 10)
}

function dayAfter(date: string): string {
  return new Date(Date.parse(date) + DAY_MS).toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
