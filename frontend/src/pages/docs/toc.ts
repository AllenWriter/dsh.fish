import type { DocsTocItem } from '@/widgets/docs-shell'

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/

export function stripDocsFrontmatter(markdown: string): string {
  return markdown.replace(FRONTMATTER, '')
}

/**
 * GitHub-style heading ids. Same algorithm as github-slugger so TOC hashes
 * match the `id` we put on the rendered heading.
 */
export function slugifyDocsHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
    .replace(/\s/g, '-')
}

export function docsHeadingIdFactory(): (title: string) => string {
  const seen = new Map<string, number>()
  return (title: string) => {
    const base = slugifyDocsHeading(title)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  }
}

export function docsMarkdownChildText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(docsMarkdownChildText).join('')
  if (value && typeof value === 'object' && 'props' in value) {
    const element = value as { props?: { children?: unknown } }
    return docsMarkdownChildText(element.props?.children)
  }
  return ''
}

/** On-this-page rail, read from the Markdown headings rather than a compiler. */
export function tocFromDocsMarkdown(markdown: string): DocsTocItem[] {
  const body = stripDocsFrontmatter(markdown)
  const items: DocsTocItem[] = []
  const idFor = docsHeadingIdFactory()
  let inFence = false

  for (const line of body.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = /^(#{1,4})\s+(.+?)\s*$/.exec(line)
    if (match === null) continue
    const title = match[2]!.replace(/#+\s*$/, '').trim()
    if (title === '') continue
    items.push({ title, url: `#${idFor(title)}`, depth: match[1]!.length })
  }

  return items
}
