import { parse as parseYaml } from 'yaml'
import { classifyPackage, parseSkillFrontmatter } from '../../domain/artifact/manifest.js'
import type { PackageManifest } from '../../domain/artifact/manifest.js'
import type { ArtifactPayload } from '../../domain/artifact/artifact-payload.js'
import { githubSource } from '../../domain/artifact/source-ref.js'
import type { SourceRef } from '../../domain/artifact/source-ref.js'
import { slugify } from '../../domain/shared/slug.js'
import type {
  IndexedSnapshot,
  IndexRequest,
  SourceIndexer,
} from '../../application/port/source-indexer.js'

/** The topic the harness README asks plugin authors to tag their repositories with. */
export const DSH_PLUGIN_TOPIC = 'dsh-plugin'

const API = 'https://api.github.com'

interface RepoSearchItem {
  full_name: string
  name: string
  owner: { login: string; html_url: string; avatar_url: string }
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
 * yields nothing, because the harness would load nothing from it either.
 */
export class GitHubIndexer implements SourceIndexer {
  readonly origin = 'github' as const

  constructor(private readonly token?: string) {}

  async discover(limit: number): Promise<readonly IndexedSnapshot[]> {
    const perPage = Math.min(limit, 100)
    const url = `${API}/search/repositories?q=topic:${DSH_PLUGIN_TOPIC}&sort=stars&order=desc&per_page=${perPage}`
    const response = await this.request(url)
    if (!response) return []

    const body = (await response.json()) as { items?: RepoSearchItem[] }
    const items = body.items ?? []
    const snapshots: IndexedSnapshot[] = []

    for (const item of items) {
      try {
        const snapshot = await this.indexRepository(item)
        if (snapshot) snapshots.push(snapshot)
      } catch {
        // One unreadable repository never fails the sweep.
      }
    }
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
    const head = await this.resolveCommit(repo.owner.login, repo.name, ref)

    const source: SourceRef = githubSource({
      owner: repo.owner.login,
      repo: repo.name,
      ...(subPath === undefined || subPath === '' ? {} : { path: subPath }),
      ...(head === undefined ? {} : { commit: head }),
    })

    const base = {
      keywords: repo.topics?.filter((topic) => topic !== DSH_PLUGIN_TOPIC) ?? [],
      categories: [] as string[],
      author: { name: repo.owner.login, url: repo.owner.html_url },
      stats: { stars: repo.stargazers_count, downloads: 0 },
      deprecated: repo.archived,
      ...(repo.license?.spdx_id ? { license: repo.license.spdx_id } : {}),
    }

    const readme = await this.readFile(repo, `${prefix}README.md`, ref)

    // 1. A harness bundle or profile, decided by the package manifest.
    const manifestText = await this.readFile(repo, `${prefix}package.json`, ref)
    if (manifestText !== undefined) {
      const manifest = safeJson<PackageManifest>(manifestText)
      if (manifest) {
        const classification = classifyPackage(manifest, true)
        if (classification) {
          return {
            id: slugify(manifest.name),
            kind: classification.kind,
            displayName: manifest.name,
            summary: manifest.description ?? repo.description ?? manifest.name,
            source,
            payload: classification.payload,
            ...base,
            keywords: [...base.keywords, ...(manifest.keywords ?? [])],
            categories: manifest.dsh?.hub?.categories?.map(String) ?? [],
            ...(manifest.license ? { license: manifest.license } : {}),
            ...(readme === undefined ? {} : { readmeMarkdown: readme }),
          }
        }
      }
    }

    // 2. A skill: `SKILL.md` at the indexed root.
    const skillText = await this.readFile(repo, `${prefix}SKILL.md`, ref)
    if (skillText !== undefined) {
      const frontmatter = readFrontmatter(skillText)
      if (frontmatter) {
        const parsed = parseSkillFrontmatter(frontmatter)
        const payload: ArtifactPayload = {
          kind: 'skill',
          skillName: parsed.name,
          layout: 'directory',
          files: [
            {
              path: 'SKILL.md',
              downloadUrl: rawUrl(repo, `${prefix}SKILL.md`, head ?? ref),
            },
          ],
        }
        return {
          id: slugify(`${repo.owner.login}-${parsed.name}`),
          kind: 'skill',
          displayName: parsed.name,
          summary: parsed.description,
          source,
          payload,
          ...base,
          ...(readme === undefined ? {} : { readmeMarkdown: readme }),
        }
      }
    }

    // 3. An agent preset: a directory holding one `agent.cordis.yml`.
    const presetText = await this.readFile(repo, `${prefix}agent.cordis.yml`, ref)
    if (presetText !== undefined) {
      const presetId = slugify(repo.name)
      const payload: ArtifactPayload = {
        kind: 'agent-preset',
        presetId,
        compositionUrl: rawUrl(repo, `${prefix}agent.cordis.yml`, head ?? ref),
      }
      return {
        id: slugify(`${repo.owner.login}-${repo.name}`),
        kind: 'agent-preset',
        displayName: repo.name,
        summary: repo.description ?? repo.name,
        source,
        payload,
        ...base,
        ...(readme === undefined ? {} : { readmeMarkdown: readme }),
      }
    }

    return undefined
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
