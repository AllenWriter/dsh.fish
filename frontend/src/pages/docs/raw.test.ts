import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALE_CODES } from '@/shared/config/i18n'
import { docsManifestNav, docsManifestPages } from './manifest'
import {
  productDocsLocales,
  productDocsMarkdown,
  productDocsPaths,
  supportsProductDocsMarkdown,
} from './raw'
import { diskDocsMdxReader } from './read-mdx.node'
import { docsNav, docsSearchEntries, docsSitemapPaths } from './source'

const DOC_PATHS = [
  '/docs',
  '/docs/apple-paid-services',
  '/docs/batch-link-check',
  '/docs/before-going-to-hong-kong',
  '/docs/chatgpt-api-proxy',
  '/docs/clash-frontend-dashboard',
  '/docs/dify-docs-engineering',
  '/docs/dify-plugin-agent',
  '/docs/dify-video-plugin',
  '/docs/docker-nginx-proxy-redirect',
  '/docs/docusaurus-admonitions',
  '/docs/docusaurus-guide',
  '/docs/dujiaoka',
  '/docs/facebook-account-pitfalls',
  '/docs/gmail-api-bulk-send',
  '/docs/hk-broker-account',
  '/docs/hsbc-hong-kong-account',
  '/docs/metagpt-notes',
  '/docs/microsoft-e3-admin-init',
  '/docs/nginx-proxy-manager',
  '/docs/notion-dify',
  '/docs/onedrive-picgo-image-host',
  '/docs/openclaw-gui-container',
  '/docs/react-player-docusaurus',
  '/docs/register-foreign-apple-id',
  '/docs/scripts-by-gpt',
  '/docs/what-is-clash',
] as const

const TRANSLATED_DOCS = [
  '/docs',
  '/docs/chatgpt-api-proxy',
  '/docs/dify-docs-engineering',
  '/docs/dify-plugin-agent',
  '/docs/dify-video-plugin',
  '/docs/metagpt-notes',
  '/docs/notion-dify',
] as const

const read = diskDocsMdxReader

describe('productDocsMarkdown', () => {
  it('enumerates every default-language guide from the generated manifest', () => {
    expect(productDocsPaths()).toEqual(
      [...DOC_PATHS].sort((left, right) => left.localeCompare(right)),
    )
    expect(productDocsPaths()).toEqual(docsSitemapPaths())
  })

  it('serves the index and the parked notes as source Markdown', async () => {
    expect(supportsProductDocsMarkdown('/docs')).toBe(true)
    expect(supportsProductDocsMarkdown('/docs/dify-plugin-agent')).toBe(true)
    expect(supportsProductDocsMarkdown('/docs/openclaw-gui-container')).toBe(true)
    expect(await productDocsMarkdown('/docs/dify-plugin-agent', DEFAULT_LOCALE, read)).toContain('Dify')
    expect(await productDocsMarkdown('/docs/dify-docs-engineering', DEFAULT_LOCALE, read)).toContain(
      'Mintlify',
    )
    expect(await productDocsMarkdown('/docs/openclaw-gui-container', DEFAULT_LOCALE, read)).toContain(
      'OpenClaw',
    )
  })

  it('needs a reader: no body is bundled into the Worker', async () => {
    expect(await productDocsMarkdown('/docs/dify-plugin-agent')).toBeUndefined()
  })

  it('does not treat the search index as a document', async () => {
    expect(supportsProductDocsMarkdown('/docs/search')).toBe(false)
    expect(await productDocsMarkdown('/browse', DEFAULT_LOCALE, read)).toBeUndefined()
  })

  it('returns localized Markdown and falls back to the default language', async () => {
    expect(await productDocsMarkdown('/docs', 'zh-CN', read)).toContain('技术笔记')
    expect(await productDocsMarkdown('/docs/dify-plugin-agent', 'ja', read)).toContain('Dify')
    expect(await productDocsMarkdown('/docs/openclaw-gui-container', 'en', read)).toContain('OpenClaw')
    expect(await productDocsMarkdown('/docs/not-a-page', 'ja', read)).toBeUndefined()
  })

  it('has a physical translation of every fully localized guide', () => {
    for (const path of TRANSLATED_DOCS) {
      expect(productDocsLocales(path), path).toEqual(LOCALE_CODES)
    }
    expect(productDocsLocales('/docs/openclaw-gui-container')).toEqual([DEFAULT_LOCALE])
    expect(productDocsLocales('/docs/not-a-page')).toEqual([])
  })

  it('still exposes a default-language file for every how-to', () => {
    for (const path of DOC_PATHS) {
      expect(productDocsLocales(path), path).toContain(DEFAULT_LOCALE)
    }
  })
})

describe('docsNav', () => {
  it('keeps meta.json order and translates separators through i18n keys', () => {
    expect(docsManifestNav[0]).toEqual({ type: 'page', slug: 'index' })
    expect(docsManifestNav[1]).toEqual({ type: 'separator', key: 'ai' })

    const nav = docsNav('en')
    expect(nav[0]).toMatchObject({ type: 'page', url: '/docs', title: 'Docs' })
    expect(nav[1]).toEqual({ type: 'separator', titleKey: 'docs.nav.ai' })
    expect(nav.at(-1)).toMatchObject({ type: 'page', url: '/docs/dify-docs-engineering' })
    expect(nav.filter((node) => node.type === 'page')).toHaveLength(docsManifestPages.length)
  })

  it('titles pages in the requested language', () => {
    const zh = docsNav('zh-CN')
    expect(zh[0]).toMatchObject({ url: '/docs', title: '文档' })
    expect(docsNav('ja')[0]).toMatchObject({ url: '/docs', title: 'ドキュメント' })
  })
})

describe('docsSearchEntries', () => {
  it('carries a localized title and description for every guide', () => {
    const english = docsSearchEntries('en')
    expect(english).toHaveLength(DOC_PATHS.length)
    expect(english.find((page) => page.url === '/docs')).toEqual({
      url: '/docs',
      title: 'Docs',
      description: 'Technical notes.',
    })
    // A guide without an English file still answers, in the default language.
    expect(english.find((page) => page.url === '/docs/what-is-clash')?.title).toBe('什么是 Clash？')
  })
})
