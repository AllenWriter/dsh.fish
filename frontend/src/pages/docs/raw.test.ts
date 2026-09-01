import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALE_CODES } from '@/shared/config/i18n'
import { productDocsLocales, productDocsMarkdown, productDocsPaths, supportsProductDocsMarkdown } from './raw'

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

describe('productDocsMarkdown', () => {
  it('bundles the index and the parked notes', () => {
    expect(supportsProductDocsMarkdown('/docs')).toBe(true)
    expect(supportsProductDocsMarkdown('/docs/dify-plugin-agent')).toBe(true)
    expect(supportsProductDocsMarkdown('/docs/dify-docs-engineering')).toBe(true)
    expect(supportsProductDocsMarkdown('/docs/openclaw-gui-container')).toBe(true)
    expect(productDocsMarkdown('/docs/dify-plugin-agent')).toContain('Dify')
    expect(productDocsMarkdown('/docs/dify-docs-engineering')).toContain('Mintlify')
    expect(productDocsMarkdown('/docs/dify-video-plugin')).toContain('Doubao')
    expect(productDocsMarkdown('/docs/openclaw-gui-container')).toContain('OpenClaw')
  })

  it('does not treat the search index as a document', () => {
    expect(supportsProductDocsMarkdown('/docs/search')).toBe(false)
    expect(productDocsMarkdown('/browse')).toBeUndefined()
  })

  it('returns localized Markdown and falls back to the default language', () => {
    expect(productDocsMarkdown('/docs', 'zh-CN')).toContain('技术笔记')
    expect(productDocsMarkdown('/docs/dify-plugin-agent', 'ja')).toContain('Dify')
    expect(productDocsMarkdown('/docs/openclaw-gui-container', 'en')).toContain('OpenClaw')
    expect(productDocsMarkdown('/docs/not-a-page', 'ru')).toBeUndefined()
  })

  it('has a physical translation of every fully localized guide', () => {
    for (const path of TRANSLATED_DOCS) {
      expect(productDocsLocales(path), path).toEqual(LOCALE_CODES)
    }
  })

  it('still exposes a default-language file for every how-to', () => {
    for (const path of DOC_PATHS) {
      expect(productDocsLocales(path), path).toContain(DEFAULT_LOCALE)
    }
  })

  it('enumerates every default-language guide from the bundled glob', () => {
    expect(productDocsPaths()).toEqual([...DOC_PATHS].sort((left, right) => left.localeCompare(right)))
  })
})
