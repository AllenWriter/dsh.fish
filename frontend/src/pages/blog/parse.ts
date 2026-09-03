export interface BlogFrontmatter {
  readonly title: string
  readonly description: string
  readonly author: string
  readonly date: string
  readonly series: string
  readonly cover: string
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export function splitFrontmatter(source: string): {
  readonly fields: Record<string, string>
  readonly body: string
} {
  const fence = FRONTMATTER.exec(source)
  if (fence === null) {
    return { fields: {}, body: source }
  }
  const fields: Record<string, string> = {}
  for (const line of fence[1]!.split('\n')) {
    const match = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line)
    if (match === null) continue
    fields[match[1]!] = match[2]!.trim().replace(/^["']|["']$/g, '')
  }
  return { fields, body: source.slice(fence[0].length) }
}

export function stripFrontmatter(markdown: string): string {
  return markdown.replace(FRONTMATTER, '')
}

export function frontmatterField(source: string, field: string): string {
  return splitFrontmatter(source).fields[field] ?? ''
}

export function parseBlogFrontmatter(pageUrl: string, source: string): BlogFrontmatter {
  const { fields } = splitFrontmatter(source)
  const title = fields.title?.trim() ?? ''
  const description = fields.description?.trim() ?? ''
  const author = fields.author?.trim() ?? ''
  const series = fields.series?.trim() ?? ''
  const date = fields.date?.trim() ?? ''
  const cover = fields.cover?.trim() ?? ''
  if (title === '') throw new Error(`Blog post ${pageUrl} is missing a title`)
  if (description === '') throw new Error(`Blog post ${pageUrl} is missing a description`)
  if (author === '') throw new Error(`Blog post ${pageUrl} is missing an author`)
  if (date === '') throw new Error(`Blog post ${pageUrl} is missing a date`)
  if (series === '') throw new Error(`Blog post ${pageUrl} has unknown series ${series}`)
  if (!cover.startsWith('/blog/covers/')) {
    throw new Error(`Blog post ${pageUrl} has an invalid cover`)
  }
  return { title, description, author, date, series, cover }
}
