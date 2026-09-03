import type { BlogTocItem } from '@/widgets/blog-shell'
import { stripFrontmatter } from './parse'

/**
 * GitHub-style heading ids. Same algorithm as github-slugger so TOC hashes
 * match the `id` we put on the rendered heading.
 */
export function slugifyHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
    .replace(/\s/g, '-')
}

export function headingIdFactory(): (title: string) => string {
  const seen = new Map<string, number>()
  return (title: string) => {
    const base = slugifyHeading(title)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  }
}

export function markdownChildText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(markdownChildText).join('')
  if (value && typeof value === 'object' && 'props' in value) {
    const element = value as { props?: { children?: unknown } }
    return markdownChildText(element.props?.children)
  }
  return ''
}

export function tocFromMarkdown(markdown: string): BlogTocItem[] {
  const body = stripFrontmatter(markdown)
  const items: BlogTocItem[] = []
  const idFor = headingIdFactory()
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
    const id = idFor(title)
    items.push({
      title,
      url: `#${id}`,
      depth: match[1]!.length,
    })
  }
  return items
}
