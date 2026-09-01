import { DEFAULT_LOCALE, translate } from '@/shared/config/i18n'
import { markdownPath } from '@/shared/lib/seo'

/**
 * llms.txt serializers (https://llmstxt.org/ v2).
 *
 * Markdown overviews for agents, not sitemaps and not robots.txt. The root
 * file is curated: it points at the API, the kind landings, and `/docs/llms.txt`
 * rather than enumerating the catalog. File lists follow the spec shape
 * `- [name](url): notes`. Prose is English on purpose — agents fetch `/llms.txt`
 * at the origin, the same way they fetch `/robots.txt`.
 */

export interface LlmsNavNode {
  readonly type: 'separator' | 'page'
  readonly title: string
  readonly url?: string
}

export interface LlmsFullPage {
  readonly path: string
  readonly markdown: string
}

const CACHE_CONTROL = 'public, max-age=86400'

export function llmsTxtResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': CACHE_CONTROL,
    },
  })
}

function origin(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

function href(baseUrl: string, path: string): string {
  return `${origin(baseUrl)}${path}`
}

function item(name: string, url: string, notes?: string): string {
  return notes === undefined || notes === '' ? `- [${name}](${url})` : `- [${name}](${url}): ${notes}`
}

function md(baseUrl: string, path: string): string {
  return href(baseUrl, markdownPath(path))
}

/**
 * `/llms.txt` — covers the origin. Catalog rows are not listed; agents search
 * the JSON API or read the snapshot.
 */
export function rootLlmsTxt(baseUrl: string): string {
  const locale = DEFAULT_LOCALE
  const name = translate(locale, 'app.name')

  return [
    `# ${name}`,
    `> ${translate(locale, 'app.tagline')}. ${translate(locale, 'app.description')}`,
    '',
    'This file is a curated map for agents. It covers the personal blog and technical notes, not a plugin catalog.',
    '',
    'Content pages have a markdown representation: append `.md` to the path (`/docs/dify-plugin-agent.md`, `/index.md` for the home page) or send `Accept: text/markdown` on the HTML URL. English is unprefixed; other public languages use a path prefix (`/zh-CN`, `/ja`). Inference and search use is welcome; training crawlers are denied.',
    '',
    '## Start here',
    item(name, md(baseUrl, '/'), 'Personal writing index: a newsroom grid of every public post.'),
    item('Blog', href(baseUrl, '/blog/llms.txt'), 'The full editorial index, series landings, and posts.'),
    item('Docs', href(baseUrl, '/docs/llms.txt'), 'Technical notes, grouped into AI and product.'),
    '',
    '## Optional',
    item('Product docs (full)', href(baseUrl, '/docs/llms-full.txt'), 'Every English guide concatenated. Prefer /docs/llms.txt unless the whole set is needed.'),
    item('Blog feed', href(baseUrl, '/blog/feed.xml'), 'Editorial posts. Other languages at /<locale>/blog/feed.xml.'),
    item('Sitemap', href(baseUrl, '/sitemap.xml'), 'Complete URL inventory for search engines, every language of every page.'),
    '',
  ].join('\n')
}

/**
 * `/docs/llms.txt` — covers `/docs/*`. `nav` is the English product-docs tree
 * so a guide added to the MDX source appears here in the same commit.
 */
export function docsLlmsTxt(baseUrl: string, nav: readonly LlmsNavNode[]): string {
  const sections: { heading: string; entries: string[] }[] = []
  let current: { heading: string; entries: string[] } = { heading: 'Docs', entries: [] }

  for (const node of nav) {
    if (node.type === 'separator') {
      if (current.entries.length > 0) sections.push(current)
      current = { heading: node.title, entries: [] }
      continue
    }
    if (node.url === undefined) continue
    current.entries.push(item(node.title, md(baseUrl, node.url)))
  }
  if (current.entries.length > 0) sections.push(current)

  return [
    `# ${translate(DEFAULT_LOCALE, 'app.name')} documentation`,
    '> Technical notes on AI systems and shipping products.',
    '',
    'This file covers `/docs/*`. The site-wide map is `/llms.txt`. Each guide is also at the same path with `.md` appended (`/docs/dify-plugin-agent.md`). A concatenation of every English guide is `/docs/llms-full.txt`. Other languages use a path prefix (`/ja/docs/dify-plugin-agent.md`).',
    '',
    ...sections.flatMap((section) => [`## ${section.heading}`, ...section.entries, '']),
  ].join('\n')
}

/**
 * `/blog/llms.txt` — covers `/blog/*`. Series landings and posts are generated
 * from the Fumadocs collection so a new MDX file appears here in the same commit.
 */
export function blogLlmsTxt(
  baseUrl: string,
  series: readonly { title: string; url: string }[],
  posts: readonly { title: string; url: string }[],
): string {
  return [
    `# ${translate(DEFAULT_LOCALE, 'app.name')} blog`,
    '> Notes on technology, daily life, markets, and travel.',
    '',
    'This file covers `/blog/*`. The site-wide map is `/llms.txt`. Each post is also at the same path with `.md` appended (`/blog/tech/one-inbox.md`). Other languages use a path prefix (`/ja/blog`).',
    '',
    '## Start here',
    item('Blog', md(baseUrl, '/blog'), 'All posts, newest first.'),
    ...series.map((entry) => item(entry.title, md(baseUrl, entry.url))),
    '',
    '## Posts',
    ...posts.map((post) => item(post.title, md(baseUrl, post.url))),
    '',
    item('Blog feed', href(baseUrl, '/blog/feed.xml'), 'Atom feed of every post.'),
    '',
  ].join('\n')
}

/**
 * `/docs/llms-full.txt` — community convention, not in the spec. English
 * product docs only; the plugin catalog is not dumped.
 */
export function docsLlmsFull(pages: readonly LlmsFullPage[]): string {
  const header = [
    `# ${translate(DEFAULT_LOCALE, 'app.name')} documentation`,
    '',
    'English product guides, concatenated. The curated index is `/docs/llms.txt`.',
    '',
  ].join('\n')

  return [header, ...pages.map((page) => page.markdown.trim())].join('\n---\n\n')
}
