import { describe, expect, it } from 'vitest'
import { LOCALE_CODES } from '@/shared/config/i18n'
import { pageMeta } from './meta'
import { alternates, clampDescription } from './url'

const ORIGIN = 'https://dsh.fish'

type Descriptor = Record<string, unknown>

function find(list: Descriptor[], predicate: (entry: Descriptor) => boolean): Descriptor[] {
  return list.filter(predicate)
}

function content(list: Descriptor[], key: 'name' | 'property', value: string): string | undefined {
  return find(list, (entry) => entry[key] === value)[0]?.content as string | undefined
}

describe('alternates', () => {
  it('lists every language plus x-default', () => {
    const result = alternates(ORIGIN, '/browse')
    expect(result).toHaveLength(LOCALE_CODES.length + 1)
    expect(result.at(-1)).toEqual({ hreflang: 'x-default', href: `${ORIGIN}/browse` })
  })

  it('uses script subtags for Chinese, so a reader in Singapore is not excluded', () => {
    const tags = alternates(ORIGIN, '/').map((entry) => entry.hreflang)
    expect(tags).toContain('zh-Hans')
    expect(tags).toContain('zh-Hant')
    expect(tags).not.toContain('zh-CN')
  })

  it('is reciprocal: each language points at the same page in every other', () => {
    const fromJapanese = alternates(ORIGIN, '/a/dsh-hello').map((entry) => entry.href)
    const fromGerman = alternates(ORIGIN, '/a/dsh-hello').map((entry) => entry.href)
    expect(fromJapanese).toEqual(fromGerman)
    expect(fromJapanese).toContain(`${ORIGIN}/ja/a/dsh-hello`)
    expect(fromJapanese).toContain(`${ORIGIN}/de/a/dsh-hello`)
  })
})

describe('clampDescription', () => {
  it('leaves a short description untouched', () => {
    expect(clampDescription('A short summary.')).toBe('A short summary.')
  })

  it('collapses whitespace, so a wrapped readme line does not leak into a snippet', () => {
    expect(clampDescription('one\n  two   three')).toBe('one two three')
  })

  it('cuts on a word boundary and marks the cut', () => {
    const result = clampDescription('alpha bravo charlie delta echo foxtrot', 20)
    expect(result.length).toBeLessThanOrEqual(20)
    expect(result.endsWith('…')).toBe(true)
    expect(result).not.toContain('foxtrot')
  })
})

describe('pageMeta', () => {
  const indexed = pageMeta({
    origin: ORIGIN,
    locale: 'ja',
    path: '/a/dsh-hello',
    title: 'dsh-hello',
    description: 'A bundle.',
  }) as Descriptor[]

  it('canonicalises to the page in its own language', () => {
    const canonical = find(indexed, (entry) => entry.rel === 'canonical')
    expect(canonical).toHaveLength(1)
    expect(canonical[0]!.href).toBe(`${ORIGIN}/ja/a/dsh-hello`)
  })

  it('emits one alternate per language plus x-default', () => {
    const links = find(indexed, (entry) => entry.rel === 'alternate')
    expect(links).toHaveLength(LOCALE_CODES.length + 1)
  })

  it('names its own og:locale once and every other as an alternate', () => {
    expect(content(indexed, 'property', 'og:locale')).toBe('ja_JP')
    expect(find(indexed, (entry) => entry.property === 'og:locale:alternate')).toHaveLength(
      LOCALE_CODES.length - 1,
    )
  })

  it('asks for a large image preview so the social card can be used in a result', () => {
    expect(content(indexed, 'name', 'robots')).toContain('max-image-preview:large')
  })

  it('carries a Twitter card as well as Open Graph', () => {
    expect(content(indexed, 'name', 'twitter:card')).toBe('summary_large_image')
    expect(content(indexed, 'name', 'twitter:image')).toBe(`${ORIGIN}/og.png`)
  })

  describe('when the page is not for the index', () => {
    const excluded = pageMeta({
      origin: ORIGIN,
      locale: 'en',
      path: '/dashboard',
      title: 'Dashboard',
      description: 'Yours.',
      index: false,
    }) as Descriptor[]

    it('says noindex but stays followable', () => {
      expect(content(excluded, 'name', 'robots')).toBe('noindex, follow')
    })

    it('claims neither a canonical nor alternates, which would contradict it', () => {
      expect(find(excluded, (entry) => entry.rel === 'canonical')).toHaveLength(0)
      expect(find(excluded, (entry) => entry.rel === 'alternate')).toHaveLength(0)
    })
  })

  it('attaches structured data blocks verbatim', () => {
    const withLd = pageMeta({
      origin: ORIGIN,
      locale: 'en',
      path: '/',
      title: 'dsh.fish',
      description: 'Hub.',
      jsonLd: [{ '@type': 'WebSite' }],
    }) as Descriptor[]
    const blocks = find(withLd, (entry) => 'script:ld+json' in entry)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!['script:ld+json']).toEqual({ '@type': 'WebSite' })
  })
})
