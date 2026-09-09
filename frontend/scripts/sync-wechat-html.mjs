#!/usr/bin/env node
/**
 * Sync high-fidelity WeChat HTML from materials into the blog public tree.
 *
 * Usage:
 *   node frontend/scripts/sync-wechat-html.mjs \
 *     --materials "/workspace/materials/饭统戴老板/董建华的狮子山下" \
 *     --slug dong-jian-hua-de-shi-zi-shan-xia-a56bee
 *
 *   node frontend/scripts/sync-wechat-html.mjs --all
 *
 * Copies article.wechat.html + images/ → public/blog/wechat/<slug>/
 * and sets htmlBody: true on the MDX frontmatter when the post exists.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = join(here, '..')
const repoRoot = join(frontendRoot, '..')
const materialsRoot = resolve(repoRoot, '..', 'materials')
const contentWechat = join(frontendRoot, 'content/blog/wechat')
const publicWechat = join(frontendRoot, 'public/blog/wechat')

function parseArgs(argv) {
  const out = { all: false, materials: undefined, slug: undefined }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--all') out.all = true
    else if (a === '--materials') out.materials = argv[++i]
    else if (a === '--slug') out.slug = argv[++i]
    else if (a === '--help' || a === '-h') out.help = true
  }
  return out
}

function parseFrontmatter(source) {
  const fence = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fence) return { fields: {}, body: source, raw: null }
  const fields = {}
  for (const line of fence[1].split('\n')) {
    const match = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line)
    if (!match) continue
    fields[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
  return { fields, body: source.slice(fence[0].length), raw: fence[0], fenceInner: fence[1] }
}

function setHtmlBodyFlag(mdxPath) {
  if (!existsSync(mdxPath)) return false
  const source = readFileSync(mdxPath, 'utf8')
  const { fields, fenceInner, raw } = parseFrontmatter(source)
  if (!raw || !fenceInner) return false
  if (fields.htmlBody === 'true') return true
  const lines = fenceInner.split('\n').filter((l) => !/^htmlBody\s*:/.test(l))
  lines.push('htmlBody: true')
  const next = `---\n${lines.join('\n')}\n---${source.slice(raw.length)}`
  writeFileSync(mdxPath, next, 'utf8')
  return true
}

function titleFromMaterialsDir(dir) {
  const htmlPath = join(dir, 'article.wechat.html')
  if (!existsSync(htmlPath)) return undefined
  const html = readFileSync(htmlPath, 'utf8')
  const title =
    /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ||
    /property="og:title"\s+content="([^"]*)"/i.exec(html)?.[1]?.trim()
  return title
}

function findSlugByTitle(title) {
  if (!title || !existsSync(contentWechat)) return undefined
  for (const entry of readdirSync(contentWechat)) {
    if (!entry.endsWith('.mdx')) continue
    const source = readFileSync(join(contentWechat, entry), 'utf8')
    const { fields } = parseFrontmatter(source)
    if (fields.title === title) return entry.slice(0, -'.mdx'.length)
  }
  return undefined
}

function syncOne(materialsDir, slug) {
  const htmlSrc = join(materialsDir, 'article.wechat.html')
  if (!existsSync(htmlSrc)) {
    throw new Error(`Missing ${htmlSrc}`)
  }
  const imagesSrc = join(materialsDir, 'images')
  const destDir = join(publicWechat, slug)
  const imagesDest = join(destDir, 'images')
  mkdirSync(destDir, { recursive: true })
  cpSync(htmlSrc, join(destDir, 'article.wechat.html'))
  if (existsSync(imagesSrc)) {
    mkdirSync(imagesDest, { recursive: true })
    cpSync(imagesSrc, imagesDest, { recursive: true })
  }
  const mdxPath = join(contentWechat, `${slug}.mdx`)
  const flagged = setHtmlBodyFlag(mdxPath)
  return {
    slug,
    html: join(destDir, 'article.wechat.html'),
    images: existsSync(imagesDest) ? imagesDest : null,
    mdxFlagged: flagged,
  }
}

function discoverAll() {
  const pairs = []
  if (!existsSync(materialsRoot)) return pairs
  for (const account of readdirSync(materialsRoot)) {
    const accountDir = join(materialsRoot, account)
    let entries
    try {
      entries = readdirSync(accountDir)
    } catch {
      continue
    }
    for (const titleDir of entries) {
      const dir = join(accountDir, titleDir)
      const html = join(dir, 'article.wechat.html')
      if (!existsSync(html)) continue
      const title = titleFromMaterialsDir(dir) || titleDir
      const slug = findSlugByTitle(title)
      if (!slug) {
        console.warn(`skip (no matching MDX title="${title}"): ${dir}`)
        continue
      }
      pairs.push({ dir, slug, title })
    }
  }
  return pairs
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(`Usage:
  node sync-wechat-html.mjs --materials <dir> --slug <slug>
  node sync-wechat-html.mjs --all`)
    process.exit(0)
  }

  const results = []
  if (args.all) {
    for (const pair of discoverAll()) {
      results.push(syncOne(pair.dir, pair.slug))
    }
  } else if (args.materials && args.slug) {
    results.push(syncOne(resolve(args.materials), args.slug))
  } else if (args.materials) {
    const dir = resolve(args.materials)
    const title = titleFromMaterialsDir(dir)
    const slug = args.slug || findSlugByTitle(title) || findSlugByTitle(
      // fallback: directory name as title
      dir.split(/[/\\]/).filter(Boolean).at(-1),
    )
    if (!slug) throw new Error(`Cannot resolve slug for ${dir} (title=${title})`)
    results.push(syncOne(dir, slug))
  } else {
    console.error('Provide --materials [--slug] or --all')
    process.exit(1)
  }

  for (const r of results) {
    console.log(
      `synced ${r.slug}: html=${r.html} images=${r.images ?? '(none)'} mdxFlag=${r.mdxFlagged}`,
    )
  }
  console.log(`done: ${results.length} post(s)`)
}

main()
