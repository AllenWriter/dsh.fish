import { classifyPackage } from '../../domain/artifact/manifest.js'
import type { PackageManifest } from '../../domain/artifact/manifest.js'
import { resolveCategories } from '../../domain/artifact/category-inference.js'
import { npmSource, githubRepoFromUrl } from '../../domain/artifact/source-ref.js'
import { slugify } from '../../domain/shared/slug.js'
import type {
  IndexedSnapshot,
  IndexRequest,
  SourceIndexer,
} from '../../application/port/source-indexer.js'
import { GitHubSocialPreview } from './github-social-preview.js'

const REGISTRY = 'https://registry.npmjs.org'
const SEARCH = `${REGISTRY}/-/v1/search`
const DOWNLOADS = 'https://api.npmjs.org/downloads/point/last-week'

interface SearchResponse {
  objects?: {
    package: { name: string }
    score?: { final?: number }
  }[]
}

interface PackumentVersion extends PackageManifest {
  deprecated?: string
  repository?: { url?: string } | string
  homepage?: string
  author?: { name?: string; url?: string } | string
}

interface Packument {
  name: string
  'dist-tags'?: { latest?: string }
  versions?: Record<string, PackumentVersion>
  time?: Record<string, string>
  readme?: string
  license?: string
}

/**
 * Discovers artifacts published to npm.
 *
 * npm is where a bundle lands once its author stops asking users to install
 * from git — a published package arrives prebuilt, so it needs no pnpm build
 * allowance. The registry's own search cannot filter on a nested manifest
 * field, so this indexer searches the conventional keyword and then confirms
 * each candidate by reading its real manifest.
 */
export class NpmIndexer implements SourceIndexer {
  readonly origin = 'npm' as const

  constructor(private readonly socialPreview: GitHubSocialPreview = new GitHubSocialPreview()) {}

  async discover(limit: number): Promise<readonly IndexedSnapshot[]> {
    const names = new Set<string>()
    for (const query of ['keywords:dsh-plugin', 'keywords:dsh-bundle', 'dsh-plugin']) {
      const response = await fetch(
        `${SEARCH}?text=${encodeURIComponent(query)}&size=${Math.min(limit, 250)}`,
      )
      if (!response.ok) continue
      const body = (await response.json()) as SearchResponse
      for (const entry of body.objects ?? []) {
        names.add(entry.package.name)
      }
    }

    const snapshots: IndexedSnapshot[] = []
    for (const name of [...names].slice(0, limit)) {
      try {
        const snapshot = await this.indexPackage(name)
        if (snapshot) snapshots.push(snapshot)
      } catch {
        // A single unreadable packument never fails the sweep.
      }
    }
    return snapshots
  }

  async indexOne(request: IndexRequest): Promise<IndexedSnapshot | undefined> {
    if (request.source.origin !== 'npm') return undefined
    return this.indexPackage(request.source.packageName)
  }

  private async indexPackage(name: string): Promise<IndexedSnapshot | undefined> {
    const response = await fetch(`${REGISTRY}/${encodeURIComponent(name).replace('%40', '@')}`, {
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return undefined

    const packument = (await response.json()) as Packument
    const latest = packument['dist-tags']?.latest
    if (latest === undefined) return undefined
    const manifest = packument.versions?.[latest]
    if (!manifest) return undefined

    // A published package installs prebuilt, so it never needs a build allowance.
    const classification = classifyPackage(manifest, false)
    if (!classification) return undefined

    const downloads = await this.weeklyDownloads(name)
    const publishedIso = packument.time?.[latest]
    const ogImageUrl = await this.resolveOgImage(manifest.repository)

    return {
      id: slugify(name),
      kind: classification.kind,
      displayName: name,
      summary: manifest.description ?? name,
      source: npmSource(name, latest),
      payload: classification.payload,
      keywords: manifest.keywords ?? [],
      categories: resolveCategories(manifest.dsh?.hub?.categories?.map(String) ?? [], {
        ...(manifest.keywords === undefined ? {} : { keywords: manifest.keywords }),
        text: `${name} ${manifest.description ?? ''}`,
      }),
      ...(manifest.license ?? packument.license
        ? { license: manifest.license ?? packument.license ?? '' }
        : {}),
      ...(authorOf(manifest) === undefined ? {} : { author: authorOf(manifest)! }),
      ...(packument.readme === undefined ? {} : { readmeMarkdown: packument.readme }),
      ...(ogImageUrl === undefined ? { ogImageUrl: null } : { ogImageUrl }),
      stats: { stars: 0, downloads },
      deprecated: typeof manifest.deprecated === 'string',
      ...(publishedIso === undefined ? {} : {}),
    }
  }

  /**
   * An npm package only has a Social preview when its packument points at a
   * GitHub repository. No repository, no preview — not a guessed image.
   */
  private async resolveOgImage(
    repository: PackumentVersion['repository'],
  ): Promise<string | undefined> {
    const url = typeof repository === 'string' ? repository : repository?.url
    if (url === undefined) return undefined
    const github = githubRepoFromUrl(url)
    if (!github) return undefined
    return this.socialPreview.read(github.owner, github.repo)
  }

  private async weeklyDownloads(name: string): Promise<number> {
    const response = await fetch(`${DOWNLOADS}/${name}`)
    if (!response.ok) return 0
    const body = (await response.json()) as { downloads?: number }
    return typeof body.downloads === 'number' ? body.downloads : 0
  }
}

function authorOf(manifest: PackumentVersion): { name: string; url?: string } | undefined {
  const author = manifest.author
  if (typeof author === 'string') {
    return author.trim() === '' ? undefined : { name: author.trim() }
  }
  if (author && typeof author.name === 'string') {
    return { name: author.name, ...(author.url === undefined ? {} : { url: author.url }) }
  }
  return undefined
}
