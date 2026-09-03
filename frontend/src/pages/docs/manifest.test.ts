import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALE_CODES } from '@/shared/config/i18n'
import {
  docsLocaleCopy,
  docsManifestNav,
  docsManifestPages,
  findDocsPage,
  localizedDocsFile,
} from './manifest'
import { diskDocsMdxReader } from './read-mdx.node'
import { docsNav } from './source'

const meta = JSON.parse(readFileSync('content/docs/meta.json', 'utf8')) as {
  pages: readonly string[]
}

describe('docs manifest', () => {
  it('follows meta.json order for pages and separators', () => {
    expect(docsManifestNav.map((node) => (node.type === 'separator' ? `---${node.key}---` : node.slug))).toEqual(meta.pages)
    expect(docsManifestPages.map((page) => page.slug)).toEqual(
      meta.pages.filter((item) => !item.startsWith('---')),
    )
  })

  it('names only separators the shell can translate', () => {
    const keys = docsManifestNav.flatMap((node) => (node.type === 'separator' ? [node.key] : []))
    expect(keys).toEqual(['ai', 'self-hosted', 'accounts', 'site', 'finance', 'product'])
    expect(docsNav(DEFAULT_LOCALE).filter((node) => node.type === 'separator')).toHaveLength(keys.length)
  })

  it('has a copied asset for every page and every advertised locale', async () => {
    for (const page of docsManifestPages) {
      expect(await diskDocsMdxReader(page.file), page.file).toContain('title:')
      for (const locale of LOCALE_CODES) {
        if (page.locales[locale] === undefined) continue
        const file = localizedDocsFile(page.file, locale)
        expect(await diskDocsMdxReader(file), file).toContain('title:')
      }
    }
  })

  it('falls back to the default language for copy a locale is missing', () => {
    const page = findDocsPage('/docs/what-is-clash')
    expect(page).toBeDefined()
    expect(page!.locales.ja).toBeUndefined()
    expect(docsLocaleCopy(page!, 'ja')).toEqual(page!.locales[DEFAULT_LOCALE])
  })
})
