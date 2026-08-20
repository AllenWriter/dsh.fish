import { describe, expect, it } from 'vitest'
import { pageMeta } from './meta'
import { organizationLd } from './structured-data'
import { clampDescription } from './url'

const ORIGIN = 'https://dsh.fish'

type Descriptor = Record<string, unknown>

function find(list: Descriptor[], predicate: (entry: Descriptor) => boolean): Descriptor[] {
  return list.filter(predicate)
}

function content(list: Descriptor[], key: 'name' | 'property', value: string): string | undefined {
  return find(list, (entry) => entry[key] === value)[0]?.content as string | undefined
}

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

  it('canonicalises to the one URL of the page', () => {
    const canonical = find(indexed, (entry) => entry.rel === 'canonical')
    expect(canonical).toHaveLength(1)
    expect(canonical[0]!.href).toBe(`${ORIGIN}/a/dsh-hello`)
  })

  it('emits no hreflang alternates: one URL serves every language', () => {
    const links = find(indexed, (entry) => entry.rel === 'alternate' && 'hrefLang' in entry)
    expect(links).toHaveLength(0)
  })

  it('advertises the Atom feed on its one URL', () => {
    const feeds = find(
      indexed,
      (entry) => entry.rel === 'alternate' && entry.type === 'application/atom+xml',
    )
    expect(feeds).toHaveLength(1)
    expect(feeds[0]!.href).toBe(`${ORIGIN}/feed.xml`)
  })

  it('names its own og:locale', () => {
    expect(content(indexed, 'property', 'og:locale')).toBe('ja_JP')
  })

  it('asks for a large image preview so the social card can be used in a result', () => {
    expect(content(indexed, 'name', 'robots')).toContain('max-image-preview:large')
  })

  it('carries a Twitter card as well as Open Graph', () => {
    expect(content(indexed, 'name', 'twitter:card')).toBe('summary_large_image')
    expect(content(indexed, 'name', 'twitter:image')).toBe(`${ORIGIN}/og.png`)
    expect(content(indexed, 'name', 'twitter:image:alt')).toBe('DeepSeek Harness のプラグインハブ')
  })

  it('fully describes the preview image for Open Graph consumers', () => {
    expect(content(indexed, 'property', 'og:image:secure_url')).toBe(`${ORIGIN}/og.png`)
    expect(content(indexed, 'property', 'og:image:type')).toBe('image/png')
    expect(content(indexed, 'property', 'og:image:width')).toBe('1200')
    expect(content(indexed, 'property', 'og:image:height')).toBe('630')
    expect(content(indexed, 'property', 'og:image:alt')).toBe('DeepSeek Harness のプラグインハブ')
  })

  it('points og:image at a per-page renderer when one is given', () => {
    const own = pageMeta({
      origin: ORIGIN,
      locale: 'en',
      path: '/a/dsh-hello',
      title: 'dsh-hello',
      description: 'A bundle.',
      imagePath: '/a/dsh-hello/og.png',
    }) as Descriptor[]

    expect(content(own, 'property', 'og:image')).toBe(`${ORIGIN}/a/dsh-hello/og.png`)
    expect(content(own, 'name', 'twitter:image')).toBe(`${ORIGIN}/a/dsh-hello/og.png`)
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

describe('organizationLd', () => {
  it('uses the square brand mark as the organization logo, not the social card', () => {
    expect(organizationLd(ORIGIN, 'en').logo).toEqual({
      '@type': 'ImageObject',
      url: `${ORIGIN}/icons/whale-brand.png`,
      width: 256,
      height: 256,
    })
  })
})
