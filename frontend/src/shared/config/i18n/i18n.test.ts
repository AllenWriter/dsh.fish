import { describe, expect, it } from 'vitest'
import {
  ARTIFACT_KINDS,
  ARTIFACT_KIND_META,
} from '@dsh-fish/backend/domain/artifact/artifact-kind.js'
import { CATEGORIES } from '@dsh-fish/backend/domain/artifact/category.js'
import { Artifact } from '@dsh-fish/backend/domain/artifact/artifact.js'
import { buildInstallPlan, installTarget } from '@dsh-fish/backend/domain/artifact/install-plan.js'
import { githubSource, npmSource } from '@dsh-fish/backend/domain/artifact/source-ref.js'
import { CATALOGS, DEFAULT_LOCALE, LOCALES, LOCALE_CODES, translate } from './index'
import { canonicalLocaleRedirect, localizedPath, splitLocalePath } from './path'
import { en } from './messages'

/**
 * Contract tests between the layers, and between the languages.
 *
 * The backend deliberately emits message *keys*, never prose, so the catalog
 * stays language-neutral in the database. That only works if every key the
 * backend can emit has a translation — otherwise the UI renders a raw key like
 * `install.warning.buildAllowance` to a user. These tests enumerate the
 * emittable keys from the backend itself rather than restating them, so a newly
 * added kind, category or warning fails here instead of in production.
 */

const KEYS = Object.keys(en)

function has(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(en, key)
}

/** Every `{name}` a template expects. Order-independent. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).sort()
}

describe('catalog parity', () => {
  it('registers a catalog for every declared locale, and no others', () => {
    expect(Object.keys(CATALOGS).sort()).toEqual([...LOCALE_CODES].sort())
  })

  it.each(LOCALE_CODES)('%s translates every key, with nothing left blank', (locale) => {
    const catalog = CATALOGS[locale] as Record<string, string>
    const missing = KEYS.filter((key) => (catalog[key] ?? '').trim() === '')
    expect(missing, `${locale} is missing: ${missing.join(', ')}`).toEqual([])
    // An extra key is a key nothing reads — usually a rename that landed in one
    // language and not in the source.
    expect(Object.keys(catalog).sort()).toEqual([...KEYS].sort())
  })

  it.each(LOCALE_CODES)('%s keeps every placeholder its English source declares', (locale) => {
    const catalog = CATALOGS[locale] as Record<string, string>
    for (const key of KEYS) {
      const expected = placeholders(en[key as keyof typeof en])
      if (expected.length === 0) continue
      // A dropped `{count}` renders a sentence that silently states nothing;
      // an invented one renders the literal braces to a reader.
      expect(placeholders(catalog[key]!), `${locale}/${key}`).toEqual(expected)
    }
  })

  it('gives every locale a distinct URL prefix and a native name', () => {
    expect(new Set(LOCALES.map((entry) => entry.code)).size).toBe(LOCALES.length)
    expect(new Set(LOCALES.map((entry) => entry.nativeName)).size).toBe(LOCALES.length)
  })
})

describe('backend key coverage', () => {
  it('translates every artifact kind label, plural and description', () => {
    for (const kind of ARTIFACT_KINDS) {
      const meta = ARTIFACT_KIND_META[kind]
      expect(has(meta.labelKey), `missing ${meta.labelKey}`).toBe(true)
      expect(has(meta.descriptionKey), `missing ${meta.descriptionKey}`).toBe(true)
      const pluralKey = `${meta.labelKey.slice(0, -'.label'.length)}.plural`
      expect(has(pluralKey), `missing ${pluralKey}`).toBe(true)
    }
  })

  it('translates every category label', () => {
    for (const category of CATEGORIES) {
      expect(has(category.labelKey), `missing ${category.labelKey}`).toBe(true)
    }
  })

  it('translates every install warning the domain can raise', () => {
    // Each case is chosen to trigger a distinct warning branch.
    const target = installTarget('web')
    const plans = [
      // Build allowance + unpinned git spec.
      buildInstallPlan(
        Artifact.create({
          id: 'git-bundle',
          kind: 'bundle',
          displayName: 'Git bundle',
          summary: 'Installed from git.',
          source: githubSource({ owner: 'acme', repo: 'thing' }),
          payload: { kind: 'bundle', requiresBuild: true },
        }),
        target,
      ),
      // Profile ordering.
      buildInstallPlan(
        Artifact.create({
          id: 'a-profile',
          kind: 'profile',
          displayName: 'Profile',
          summary: 'A stack.',
          source: npmSource('dsh-profile', '1.0.0'),
          payload: { kind: 'profile', bundles: ['@deepseek-ai/dsh-base'] },
        }),
        target,
      ),
      // Credentials.
      buildInstallPlan(
        Artifact.create({
          id: 'a-server',
          kind: 'mcp-server',
          displayName: 'Server',
          summary: 'An MCP server.',
          source: npmSource('dsh-server', '1.0.0'),
          payload: {
            kind: 'mcp-server',
            serverName: 'demo',
            transport: 'stdio',
            command: 'npx',
            credentials: [{ envName: 'DEMO_TOKEN', required: true }],
          },
        }),
        target,
      ),
      // Hook bridge.
      buildInstallPlan(
        Artifact.create({
          id: 'a-hook',
          kind: 'hook-bridge',
          displayName: 'Hooks',
          summary: 'A bridge.',
          source: npmSource('dsh-hooks', '1.0.0'),
          payload: {
            kind: 'hook-bridge',
            dialect: 'claude-code',
            settingsPath: '~/.claude/settings.json',
          },
        }),
        target,
      ),
    ]

    const emitted = new Set(plans.flatMap((plan) => plan.warningKeys))
    expect(emitted.size).toBeGreaterThan(0)
    for (const key of emitted) {
      expect(has(key), `missing ${key}`).toBe(true)
    }
  })
})

describe('translate', () => {
  it('returns the key itself for an unknown key, so a gap is loud', () => {
    expect(translate('en', 'does.not.exist')).toBe('does.not.exist')
  })

  it('substitutes named placeholders', () => {
    expect(translate('en', 'browse.searchTitle', { query: 'postgres' })).toContain('postgres')
  })

  it('leaves a placeholder alone when no value is supplied for it', () => {
    expect(translate('en', 'browse.searchTitle')).toContain('{query}')
  })

  it('falls back to English rather than rendering a raw key', () => {
    // Simulates a key invented at a boundary: present in the source catalog,
    // absent from a translation.
    const catalog = CATALOGS.ja as Record<string, string>
    const key = 'app.name'
    expect(translate('ja', key)).toBe(catalog[key])
  })
})

describe('locale paths', () => {
  it('serves the default language without a prefix', () => {
    expect(localizedPath(DEFAULT_LOCALE, '/browse')).toBe('/browse')
    expect(localizedPath(DEFAULT_LOCALE, '/')).toBe('/')
  })

  it('prefixes every other language, including at the root', () => {
    expect(localizedPath('ja', '/browse')).toBe('/ja/browse')
    expect(localizedPath('zh-CN', '/')).toBe('/zh-CN')
  })

  it('carries the query string through a language switch', () => {
    expect(localizedPath('de', '/browse?q=postgres&kind=skill')).toBe(
      '/de/browse?q=postgres&kind=skill',
    )
  })

  it('splits a prefixed path back into language and page', () => {
    expect(splitLocalePath('/ko/a/dsh-hello')).toEqual({
      locale: 'ko',
      path: '/a/dsh-hello',
      prefixed: true,
    })
  })

  it('treats a first segment that is not a language as part of the path', () => {
    expect(splitLocalePath('/browse')).toEqual({
      locale: DEFAULT_LOCALE,
      path: '/browse',
      prefixed: false,
    })
  })

  it('round-trips every language', () => {
    for (const locale of LOCALE_CODES) {
      expect(splitLocalePath(localizedPath(locale, '/docs'))).toEqual({
        locale,
        path: '/docs',
        prefixed: locale !== DEFAULT_LOCALE,
      })
    }
  })

  it('normalises a trailing slash away, so one page has one URL', () => {
    expect(splitLocalePath('/browse/').path).toBe('/browse')
    expect(localizedPath('fr', '/browse/')).toBe('/fr/browse')
  })
})

describe('canonical redirects', () => {
  it('folds an explicit default-language prefix onto the bare path', () => {
    expect(canonicalLocaleRedirect('/en/browse')).toBe('/browse')
    expect(canonicalLocaleRedirect('/en')).toBe('/')
  })

  it('folds a mis-cased prefix onto the canonical one', () => {
    expect(canonicalLocaleRedirect('/ZH-cn/browse')).toBe('/zh-CN/browse')
  })

  it('preserves the query string across the redirect', () => {
    expect(canonicalLocaleRedirect('/en/browse', '?q=postgres')).toBe('/browse?q=postgres')
  })

  it('leaves an already-canonical URL alone', () => {
    expect(canonicalLocaleRedirect('/ja/browse')).toBeUndefined()
    expect(canonicalLocaleRedirect('/browse')).toBeUndefined()
    expect(canonicalLocaleRedirect('/')).toBeUndefined()
  })

  it('leaves a page path that is not a language alone', () => {
    expect(canonicalLocaleRedirect('/robots.txt')).toBeUndefined()
    expect(canonicalLocaleRedirect('/a/dsh-hello')).toBeUndefined()
  })
})
