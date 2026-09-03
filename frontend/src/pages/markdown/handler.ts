import type { Container } from '@dsh-fish/backend/infrastructure/container.js'
import { localizedPath, splitLocalePath, translate, type Locale } from '@/shared/config/i18n'
import {
  CATEGORIES,
  isArtifactKind,
  isCategory,
  kindPluralKey,
} from '@/entities/artifact/model/types'
import { htmlPathFromMarkdownAlias } from '@/shared/lib/seo'
import { prefersMarkdown } from './negotiate'
import { markdownResponse } from './response'
import { artifactMarkdown, listingItemMarkdown } from './artifact'
import { productDocsMarkdown, supportsProductDocsMarkdown } from '@/pages/docs'
import { assetsDocsMdxReader } from '@/pages/docs/read-mdx'
import { blogListingEntries, blogMarkdown, supportsBlogMarkdown } from '@/pages/blog'
import { assetsBlogMdxReader, type BlogAssets } from '@/pages/blog/read-mdx'

/** How many rows a markdown listing carries. Agents page through the API. */
const LISTING_LIMIT = 50

/**
 * Whether the path serves a markdown representation under
 * `Accept: text/markdown`. The Worker uses this to decide whether an HTML page
 * may advertise `rel="alternate"; type="text/markdown"` in its Link headers.
 * Artifact ids are not checked for existence: a missing artifact answers 404,
 * and error pages carry no discovery links.
 */
export function supportsMarkdownNegotiation(pathname: string): boolean {
  const { path } = splitLocalePath(pathname)
  if (path === '/' || path === '/browse') return true
  if (/^\/a\/[^/]+$/.test(path)) return true
  const kindMatch = /^\/kind\/([\w-]+)$/.exec(path)
  if (kindMatch !== null) return isArtifactKind(kindMatch[1]!)
  const categoryMatch = /^\/category\/([\w-]+)$/.exec(path)
  if (categoryMatch !== null) return isCategory(categoryMatch[1]!)
  return supportsProductDocsMarkdown(path) || supportsBlogMarkdown(path)
}

/**
 * The markdown side of content negotiation.
 *
 * Returns a markdown Response for the catalog's content pages when the client
 * asks for `text/markdown`, or when the path is a v2 `.md` alias
 * (`/docs/cli.md`, `/index.md`). Anything else — browsers on HTML URLs, pages
 * whose value is their UI (submit, dashboard, auth), and unknown or invalid
 * paths — falls through to the React Router handler unchanged.
 */
export async function maybeMarkdownResponse(
  request: Request,
  container: Container,
  assets?: BlogAssets,
): Promise<Response | null> {
  const url = new URL(request.url)
  const { locale, path: rawPath } = splitLocalePath(url.pathname)
  const alias = htmlPathFromMarkdownAlias(rawPath)
  if (alias === undefined && !prefersMarkdown(request.headers.get('accept'))) return null

  const path = alias ?? rawPath
  const origin = container.config.baseUrl

  const artifactMatch = /^\/a\/([^/]+)$/.exec(path)
  if (artifactMatch !== null) {
    return artifactResponse(container, origin, locale, artifactMatch[1]!, url)
  }

  if (path === '/') return homeResponse(container, origin, locale)

  const kindMatch = /^\/kind\/([\w-]+)$/.exec(path)
  if (kindMatch !== null) {
    const raw = kindMatch[1]!
    if (!isArtifactKind(raw)) return null
    return listingResponse(container, origin, locale, url, {
      kinds: [raw],
      categories: [],
      title: translate(locale, kindPluralKey(raw)),
    })
  }

  const categoryMatch = /^\/category\/([\w-]+)$/.exec(path)
  if (categoryMatch !== null) {
    const raw = categoryMatch[1]!
    if (!isCategory(raw)) return null
    const labelKey = CATEGORIES.find((entry) => entry.id === raw)?.labelKey ?? `category.${raw}`
    return listingResponse(container, origin, locale, url, {
      kinds: [],
      categories: [raw],
      title: translate(locale, labelKey),
    })
  }

  const blogReader = assets === undefined ? undefined : assetsBlogMdxReader(assets)

  if (path === '/browse') {
    const blog = await blogMarkdown('/blog', locale, blogReader)
    if (blog !== undefined) return markdownResponse(blog)
  }

  const docsReader = assets === undefined ? undefined : assetsDocsMdxReader(assets)
  const docsMarkdown = await productDocsMarkdown(path, locale, docsReader)
  if (docsMarkdown !== undefined) return markdownResponse(docsMarkdown)

  const blog = await blogMarkdown(path, locale, blogReader)
  if (blog !== undefined) return markdownResponse(blog)

  return null
}

async function artifactResponse(
  container: Container,
  origin: string,
  locale: Locale,
  artifactId: string,
  url: URL,
): Promise<Response | null> {
  const artifact = await container.useCases.getArtifactDetail
    .execute(artifactId, locale)
    .catch(() => undefined)
  if (!artifact) return null

  const profile = url.searchParams.get('profile') ?? undefined
  const plan = await container.useCases.resolveInstallPlan.execute({
    artifactId: artifact.id,
    ...(profile === undefined ? {} : { profile }),
  })

  return markdownResponse(artifactMarkdown(origin, locale, artifact, plan))
}

async function homeResponse(
  _container: Container,
  origin: string,
  locale: Locale,
): Promise<Response> {
  const posts = blogListingEntries(locale)

  const lines: string[] = [
    '---',
    `title: ${translate(locale, 'app.name')}`,
    `description: ${translate(locale, 'app.description')}`,
    `image: ${origin}/og.png`,
    '---',
    '',
    `# ${translate(locale, 'app.name')}`,
    '',
    translate(locale, 'app.tagline'),
    '',
    `- ${translate(locale, 'nav.blog')}: ${origin}${localizedPath(locale, '/blog')}`,
    `- ${translate(locale, 'nav.docs')}: ${origin}${localizedPath(locale, '/docs')}`,
    '',
    `## ${translate(locale, 'blog.title')}`,
    '',
    ...posts.map(
      (entry) =>
        `- [${entry.title}](${origin}${localizedPath(locale, entry.path)}) — ${entry.date}`,
    ),
    '',
  ]

  return markdownResponse(lines.join('\n'))
}

async function listingResponse(
  container: Container,
  origin: string,
  locale: Locale,
  url: URL,
  filter: {
    kinds: readonly string[]
    categories: readonly string[]
    title: string
  },
): Promise<Response> {
  const query = url.searchParams.get('q') ?? ''

  const results = await container.useCases.searchArtifacts.execute({
    locale,
    ...(query === '' ? {} : { text: query }),
    kinds: [...filter.kinds],
    categories: [...filter.categories],
    ...(url.searchParams.get('sort') ? { sort: url.searchParams.get('sort')! } : {}),
    ...(url.searchParams.get('verified') === 'true' ? { verifiedOnly: true } : {}),
    limit: LISTING_LIMIT,
    offset: Number(url.searchParams.get('offset') ?? 0),
  })

  const lines: string[] = [
    '---',
    `title: ${filter.title} — ${translate(locale, 'app.name')}`,
    `description: ${translate(locale, 'seo.browse.description')}`,
    '---',
    '',
    `# ${filter.title}`,
    '',
    translate(locale, 'markdown.resultCount', { count: results.total }),
    '',
    ...results.items.map((item) => listingItemMarkdown(origin, locale, item)),
    '',
  ]

  return markdownResponse(lines.join('\n'))
}
