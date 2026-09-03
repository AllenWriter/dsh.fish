import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = join(here, '..')
const contentDir = join(frontendRoot, 'content/blog')
const publicDir = join(frontendRoot, 'public/blog/mdx')
const manifestPath = join(frontendRoot, 'src/pages/blog/manifest.generated.json')

const DEFAULT_LOCALE = 'zh-CN'
const LOCALES = ['en', 'zh-CN', 'ja']
const SERIES = new Set(['podcast', 'tech', 'life', 'finance', 'travel'])
const TRANSLATION_SUFFIXES = ['.en', '.ja', '.zh-TW', '.ko', '.ru']

function parseFrontmatter(source: string, file: string): Record<string, string> {
  const fence = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (fence === null) {
    throw new Error(`${file} is missing YAML frontmatter`)
  }
  const fields: Record<string, string> = {}
  for (const line of fence[1]!.split('\n')) {
    const match = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line)
    if (match === null) continue
    fields[match[1]!] = match[2]!.trim().replace(/^["']|["']$/g, '')
  }
  return fields
}

function walkMdx(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walkMdx(full, files)
      continue
    }
    if (entry.endsWith('.mdx')) files.push(full)
  }
  return files
}

function localeFromRelative(relativePath: string): { locale: string; file: string } {
  const withoutExt = relativePath.slice(0, -'.mdx'.length)
  for (const suffix of TRANSLATION_SUFFIXES) {
    if (withoutExt.endsWith(suffix)) {
      return {
        locale: suffix.slice(1),
        file: `${withoutExt.slice(0, -suffix.length)}.mdx`,
      }
    }
  }
  return { locale: DEFAULT_LOCALE, file: relativePath }
}

function requireField(fields: Record<string, string>, key: string, file: string): string {
  const value = fields[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${file} is missing ${key}`)
  }
  return value.trim()
}

export function syncBlogStaticAssets() {
  const files = walkMdx(contentDir)
  if (files.length === 0) {
    throw new Error(`No blog MDX files under ${contentDir}`)
  }

  type ManifestPost = {
    url: string
    series: string
    slug: string
    file: string
    cover: string
    locales: Record<string, { title: string; description: string; author: string; date: string }>
  }
  const posts = new Map<string, ManifestPost>()

  for (const full of files) {
    const rel = relative(contentDir, full).replaceAll('\\', '/')
    const { locale, file } = localeFromRelative(rel)
    const parts = file.slice(0, -'.mdx'.length).split('/')
    if (parts.length !== 2) {
      throw new Error(`Blog MDX must live at {series}/{slug}.mdx: ${rel}`)
    }
    const series = parts[0]!
    const slug = parts[1]!
    if (!SERIES.has(series)) {
      throw new Error(`Blog post ${rel} has unknown series ${series}`)
    }

    const fields = parseFrontmatter(readFileSync(full, 'utf8'), rel)
    const title = requireField(fields, 'title', rel)
    const description = requireField(fields, 'description', rel)
    const author = requireField(fields, 'author', rel)
    const date = requireField(fields, 'date', rel)
    const cover = requireField(fields, 'cover', rel)
    const seriesField = requireField(fields, 'series', rel)
    if (seriesField !== series) {
      throw new Error(`Blog post ${rel} series frontmatter ${seriesField} does not match folder ${series}`)
    }
    if (!cover.startsWith('/blog/covers/')) {
      throw new Error(`Blog post ${rel} has an invalid cover`)
    }

    if (!LOCALES.includes(locale) && locale !== DEFAULT_LOCALE) {
      // Retired locale files are copied as static assets but skipped in the listing manifest.
      continue
    }
    if (!LOCALES.includes(locale)) continue

    const url = `/blog/${series}/${slug}`
    let post = posts.get(url)
    if (post === undefined) {
      post = { url, series, slug, file, cover, locales: {} }
      posts.set(url, post)
    }
    if (locale === DEFAULT_LOCALE) {
      post.cover = cover
      post.file = file
    }
    post.locales[locale] = { title, description, author, date }
  }

  for (const post of posts.values()) {
    if (post.locales[DEFAULT_LOCALE] === undefined) {
      throw new Error(`Blog post ${post.url} is missing a default-language file`)
    }
  }

  const manifest = {
    posts: [...posts.values()].sort((left, right) => left.url.localeCompare(right.url)),
  }

  mkdirSync(dirname(manifestPath), { recursive: true })
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  rmSync(publicDir, { recursive: true, force: true })
  mkdirSync(dirname(publicDir), { recursive: true })
  cpSync(contentDir, publicDir, { recursive: true })
}

export function blogStaticAssets(): Plugin {
  syncBlogStaticAssets()
  return {
    name: 'blog-static-assets',
    buildStart() {
      syncBlogStaticAssets()
    },
    configureServer(server) {
      server.watcher.add(contentDir)
      server.watcher.on('all', (_event, file) => {
        const normalized = String(file).replaceAll('\\', '/')
        if (normalized.includes('/content/blog/') && normalized.endsWith('.mdx')) {
          syncBlogStaticAssets()
        }
      })
    },
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  syncBlogStaticAssets()
  console.log(`blog static assets: wrote ${manifestPath}`)
}
