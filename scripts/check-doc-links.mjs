/**
 * Verifies that relative Markdown links in the documentation resolve to real
 * files or directories. External URLs and in-page anchors are out of scope.
 *
 * Usage: node scripts/check-doc-links.mjs
 */
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

async function* markdownFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* markdownFiles(full)
    } else if (entry.name.endsWith('.md')) {
      yield full
    }
  }
}

async function* documents() {
  yield* markdownFiles(path.join(root, 'docs'))
  for (const entry of await readdir(root)) {
    if (entry.endsWith('.md')) yield path.join(root, entry)
  }
}

const LINK = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

let broken = 0
for await (const file of documents()) {
  const source = await readFile(file, 'utf8')
  const lines = source.split('\n')
  lines.forEach((line, index) => {
    for (const match of line.matchAll(LINK)) {
      const target = match[1]
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue
      const resolved = path.join(
        path.dirname(file),
        decodeURIComponent(target.split('#')[0] ?? ''),
      )
      if (!existsSync(resolved)) {
        broken += 1
        console.error(`${path.relative(root, file)}:${index + 1} -> ${target}`)
      }
    }
  })
}

if (broken > 0) {
  console.error(`\n${broken} broken documentation link(s).`)
  process.exit(1)
}
console.log('All documentation links resolve.')
