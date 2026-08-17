import { parse as parseYaml } from 'yaml'
import { classifyPackage, parseSkillFrontmatter } from '../../domain/artifact/manifest.js'
import type { PackageManifest } from '../../domain/artifact/manifest.js'
import type { ArtifactPayload } from '../../domain/artifact/artifact-payload.js'
import { resolveCategories } from '../../domain/artifact/category-inference.js'
import { githubSource } from '../../domain/artifact/source-ref.js'
import type { SourceRef } from '../../domain/artifact/source-ref.js'
import { slugify } from '../../domain/shared/slug.js'
import type {
  IndexedSnapshot,
  IndexRequest,
  SourceIndexer,
} from '../../application/port/source-indexer.js'
import type { SweepCursor } from './sweep-cursor.js'
import { GitHubSocialPreview } from './github-social-preview.js'

/** The topic the harness README asks plugin authors to tag their repositories with. */
export const DSH_PLUGIN_TOPIC = 'dsh-plugin'

const API = 'https://api.github.com'

/** GitHub's search API never returns more than this, whatever the paging. */
const MAX_SEARCH_RESULTS = 1000
const PAGE_SIZE = 100
const MAX_PAGE = MAX_SEARCH_RESULTS / PAGE_SIZE

/** The three files that make a repository something the harness can load. */
const MANIFEST_FILE = 'package.json'
const SKILL_FILE = 'SKILL.md'
const PRESET_FILE = 'agent.cordis.yml'

interface RepoSearchItem {
  full_name: string
  name: string
  owner: { id: number; login: string; html_url: string; avatar_url: string }
  description: string | null
  stargazers_count: number
  license: { spdx_id: string } | null
  topics?: string[]
  default_branch: string
  pushed_at: string
  archived: boolean
}

/**
 * Discovers artifacts from GitHub.
 *
 * The harness has no registry of its own — its README simply asks authors to
 * tag repositories with the `dsh-plugin` topic. That topic is therefore the
 * closest thing to an authoritative source list, and this indexer treats it as
 * the seed set.
 *
 * A repository is classified by what it actually contains, not by what it
 * claims: a `package.json` with `dsh.bundle` is a bundle, a `SKILL.md` is a
 * skill, an `agent.cordis.yml` is a preset. A repository holding none of those
 * yields nothing, because the harness would load nothing from it either. That
 * is the common case by a wide margin — the topic is popular enough that most
 * of what carries it is an application, not a plugin — so the three probes run
 * before anything else is fetched, and a repository that fails all three costs
 * three reads of `raw.githubusercontent.com` and no API quota at all.
 */
export class GitHubIndexer implements SourceIndexer {
  readonly origin = 'github' as const

  constructor(
    private readonly token?: string,
    private readonly cursor?: SweepCursor,
    private readonly socialPreview: GitHubSocialPreview = new GitHubSocialPreview(token),
  ) {}

  /**
   * Read one slice of the topic, resuming where the last run stopped.
   *
   * Sorting by stars puts the same well-known repositories at the head of every
   * search, and those are precisely the ones that are not plugins. Paging from
   * a stored cursor is what lets the crawler reach the rest of the topic across
   * successive scheduled runs instead of re-reading the head forever.
   */
  async discover(limit: number): Promise<readonly IndexedSnapshot[]> {
    const snapshots: IndexedSnapshot[] = []
    let page = clampPage(await this.readCursor())
    let scanned = 0
    let pagesRead = 0

    while (scanned < limit && pagesRead < MAX_PAGE) {
      const items = await this.searchPage(page)
      pagesRead += 1
      if (items === undefined || items.length === 0) {
        page = 1
        break
      }

      for (const item of items) {
        if (scanned >= limit) break
        scanned += 1
        try {
          const snapshot = await this.indexRepository(item)
          if (snapshot) snapshots.push(snapshot)
        } catch {
          // One unreadable repository never fails the sweep.
        }
      }

      // A short page is the end of the result set. Wrapping to the front is not
      // wasted work: the sweep is how existing rows get their stars, summary
      // and readme refreshed.
      const exhausted = items.length < PAGE_SIZE
      page = exhausted ? 1 : (page % MAX_PAGE) + 1
      if (exhausted) break
    }

    await this.writeCursor(page)
    return snapshots
  }

  async indexOne(request: IndexRequest): Promise<IndexedSnapshot | undefined> {
    const source = request.source
    if (source.origin !== 'github') return undefined
    const response = await this.request(`${API}/repos/${source.owner}/${source.repo}`)
    if (!response) return undefined
    const repo = (await response.json()) as RepoSearchItem
    return this.indexRepository(repo, source.path)
  }

  private async indexRepository(
    repo: RepoSearchItem,
    subPath?: string,
  ): Promise<IndexedSnapshot | undefined> {
    const ref = repo.default_branch
    const prefix = subPath === undefined || subPath === '' ? '' : `${subPath}/`
    const topics = repo.topics?.filter((topic) => topic !== DSH_PLUGIN_TOPIC) ?? []

    const base = {
      keywords: topics,
      author: { name: repo.owner.login, url: repo.owner.html_url },
      // The numeric id, not the login: it is what an OAuth link records, and it
      // survives the owner renaming themselves.
      sourceOwnerId: String(repo.owner.id),
      stats: { stars: repo.stargazers_count, downloads: 0 },
      deprecated: repo.archived,
      ...(repo.license?.spdx_id ? { license: repo.license.spdx_id } : {}),
    }

    // 1. A harness bundle or profile, decided by the package manifest.
    const manifestText = await this.readFile(repo, `${prefix}${MANIFEST_FILE}`, ref)
    if (manifestText !== undefined) {
      const manifest = safeJson<PackageManifest>(manifestText)
      if (manifest) {
        const classification = classifyPackage(manifest, true)
        if (classification) {
          const context = await this.loadContext(repo, subPath, prefix, ref)
          const keywords = [...topics, ...(manifest.keywords ?? [])]
          return {
            id: slugify(manifest.name),
            kind: classification.kind,
            displayName: manifest.name,
            summary: manifest.description ?? repo.description ?? manifest.name,
            source: context.source,
            payload: classification.payload,
            ...base,
            keywords,
            categories: resolveCategories(manifest.dsh?.hub?.categories?.map(String) ?? [], {
              keywords,
              text: `${manifest.name} ${manifest.description ?? repo.description ?? ''}`,
            }),
            ...(manifest.license ? { license: manifest.license } : {}),
            ...(context.readme === undefined ? {} : { readmeMarkdown: context.readme }),
            ogImageUrl: context.ogImageUrl,
          }
        }
      }
    }

    // 2. A skill: `SKILL.md` at the indexed root.
    const skillText = await this.readFile(repo, `${prefix}${SKILL_FILE}`, ref)
    if (skillText !== undefined) {
      const frontmatter = readFrontmatter(skillText)
      if (frontmatter) {
        const parsed = parseSkillFrontmatter(frontmatter)
        const context = await this.loadContext(repo, subPath, prefix, ref)
        const payload: ArtifactPayload = {
          kind: 'skill',
          skillName: parsed.name,
          layout: 'directory',
          files: [
            {
              path: SKILL_FILE,
              downloadUrl: rawUrl(repo, `${prefix}${SKILL_FILE}`, context.head ?? ref),
            },
          ],
        }
        return {
          id: slugify(`${repo.owner.login}-${parsed.name}`),
          kind: 'skill',
          displayName: parsed.name,
          summary: parsed.description,
          source: context.source,
          payload,
          ...base,
          // A skill declares no manifest, so its own name and description are
          // the whole vocabulary there is to file it by.
          categories: resolveCategories([], {
            keywords: topics,
            text: `${parsed.name} ${parsed.description}`,
          }),
          ...(context.readme === undefined ? {} : { readmeMarkdown: context.readme }),
          ogImageUrl: context.ogImageUrl,
        }
      }
    }

    // 3. An agent preset: a directory holding one `agent.cordis.yml`.
    const presetText = await this.readFile(repo, `${prefix}${PRESET_FILE}`, ref)
    if (presetText !== undefined) {
      const context = await this.loadContext(repo, subPath, prefix, ref)
      const presetId = slugify(repo.name)
      const payload: ArtifactPayload = {
        kind: 'agent-preset',
        presetId,
        compositionUrl: rawUrl(repo, `${prefix}${PRESET_FILE}`, context.head ?? ref),
      }
      return {
        id: slugify(`${repo.owner.login}-${repo.name}`),
        kind: 'agent-preset',
        displayName: repo.name,
        summary: repo.description ?? repo.name,
        source: context.source,
        payload,
        ...base,
        categories: resolveCategories([], {
          keywords: topics,
          text: `${repo.name} ${repo.description ?? ''}`,
        }),
        ...(context.readme === undefined ? {} : { readmeMarkdown: context.readme }),
        ogImageUrl: context.ogImageUrl,
      }
    }

    return undefined
  }

  /**
   * The commit, source reference and readme — everything a row needs that a
   * repository which turns out not to be a plugin should never be charged for.
   */
  private async loadContext(
    repo: RepoSearchItem,
    subPath: string | undefined,
    prefix: string,
    ref: string,
  ): Promise<{ source: SourceRef; head?: string; readme?: string; ogImageUrl: string }> {
    const head = await this.resolveCommit(repo.owner.login, repo.name, ref)
    const readme = await this.readFile(repo, `${prefix}README.md`, ref)
    const ogImageUrl = await this.socialPreview.read(repo.owner.login, repo.name, head)
    return {
      source: githubSource({
        owner: repo.owner.login,
        repo: repo.name,
        ...(subPath === undefined || subPath === '' ? {} : { path: subPath }),
        ...(head === undefined ? {} : { commit: head }),
      }),
      ...(head === undefined ? {} : { head }),
      ...(readme === undefined ? {} : { readme }),
      ogImageUrl,
    }
  }

  private async searchPage(page: number): Promise<RepoSearchItem[] | undefined> {
    const url = `${API}/search/repositories?q=topic:${DSH_PLUGIN_TOPIC}&sort=stars&order=desc&per_page=${PAGE_SIZE}&page=${page}`
    const response = await this.request(url)
    if (!response) return undefined
    const body = (await response.json()) as { items?: RepoSearchItem[] }
    return body.items ?? []
  }

  private async readCursor(): Promise<number> {
    if (!this.cursor) return 1
    try {
      return await this.cursor.read()
    } catch {
      // A cursor read that fails costs coverage, not correctness.
      return 1
    }
  }

  private async writeCursor(page: number): Promise<void> {
    if (!this.cursor) return
    try {
      await this.cursor.write(page)
    } catch {
      // The next run repeats this slice instead of advancing. Harmless: the
      // crawl is idempotent.
    }
  }

  private async resolveCommit(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<string | undefined> {
    const response = await this.request(`${API}/repos/${owner}/${repo}/commits/${ref}`)
    if (!response) return undefined
    const body = (await response.json()) as { sha?: string }
    return typeof body.sha === 'string' ? body.sha : undefined
  }

  private async readFile(
    repo: RepoSearchItem,
    path: string,
    ref: string,
  ): Promise<string | undefined> {
    const response = await this.request(rawUrl(repo, path, ref), { accept: 'text/plain' })
    if (!response) return undefined
    const text = await response.text()
    return text.length > 200_000 ? text.slice(0, 200_000) : text
  }

  private async request(
    url: string,
    options: { accept?: string } = {},
  ): Promise<Response | undefined> {
    const headers: Record<string, string> = {
      accept: options.accept ?? 'application/vnd.github+json',
      'user-agent': 'dsh.fish-indexer',
    }
    if (this.token !== undefined) {
      headers['authorization'] = `Bearer ${this.token}`
    }
    const response = await fetch(url, { headers })
    if (!response.ok) return undefined
    return response
  }
}

/** A stored cursor past the search API's ceiling would return nothing forever. */
function clampPage(page: number): number {
  return page >= 1 && page <= MAX_PAGE ? Math.floor(page) : 1
}

function rawUrl(repo: RepoSearchItem, path: string, ref: string): string {
  return `https://raw.githubusercontent.com/${repo.owner.login}/${repo.name}/${ref}/${path}`
}

function safeJson<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}

/** Read a Markdown file's YAML frontmatter block, if it has one. */
export function readFrontmatter(text: string): Record<string, unknown> | undefined {
  if (!text.startsWith('---')) return undefined
  const end = text.indexOf('\n---', 3)
  if (end === -1) return undefined
  try {
    const parsed = parseYaml(text.slice(3, end))
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}
