import { localeDefinition, translate, type Locale } from '@/shared/config/i18n'
import { HUB_REPO_URL, OG_IMAGE } from '@/shared/config/site'
import { absoluteUrl, clampDescription } from './url'

export type Ld = Record<string, unknown>

export const SCHEMA = 'https://schema.org'

/**
 * Structured data, built from catalog facts only.
 *
 * Nothing here is invented for the benefit of a rich result: no rating a reader
 * never gave, no price for something that has none. A registry that fabricates
 * either gets its markup ignored at best and manually penalised at worst.
 *
 * This module stays entity-agnostic — the site-level and page-level nodes live
 * here, and the node describing an artifact lives with the artifact entity,
 * because `shared` may not know what an artifact is.
 */

/** Site-level identity. Emitted once, on the home page of each language. */
export function websiteLd(origin: string, locale: Locale): Ld {
  return {
    '@context': SCHEMA,
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: translate(locale, 'app.name'),
    url: absoluteUrl(origin, locale, '/'),
    description: clampDescription(translate(locale, 'app.description')),
    inLanguage: localeDefinition(locale).tag,
    publisher: { '@id': `${origin}/#organization` },
    // Tells an engine it may offer a search box straight into the catalog.
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl(origin, locale, '/browse')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function organizationLd(origin: string, locale: Locale): Ld {
  return {
    '@context': SCHEMA,
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: translate(locale, 'app.name'),
    url: origin,
    logo: `${origin}${OG_IMAGE.path}`,
    sameAs: [HUB_REPO_URL],
  }
}

export interface Crumb {
  readonly name: string
  /** Unlocalized path. */
  readonly path: string
}

/**
 * The trail from the hub root to this page.
 *
 * A plugin page is three clicks deep in a catalog of thousands; breadcrumbs are
 * what let a result show `dsh.fish › Skills › release-notes` instead of a bare
 * URL, and what tells an engine the collection page above it exists.
 */
export function breadcrumbLd(origin: string, locale: Locale, crumbs: readonly Crumb[]): Ld {
  return {
    '@context': SCHEMA,
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(origin, locale, crumb.path),
    })),
  }
}

export interface ListedItem {
  readonly name: string
  /** Unlocalized path to the item's own page. */
  readonly path: string
}

/**
 * A page that lists things.
 *
 * The `ItemList` names what is on *this* page, in the order it is rendered, so
 * an engine reading the collection page discovers every listed URL on it even
 * before it follows a link. `offset` keeps positions continuous across pages
 * rather than restarting at 1 on every one of them.
 */
export function collectionLd(
  origin: string,
  locale: Locale,
  input: {
    readonly path: string
    readonly name: string
    readonly description: string
    readonly items: readonly ListedItem[]
    readonly offset?: number
  },
): Ld {
  const offset = input.offset ?? 0
  const url = absoluteUrl(origin, locale, input.path)
  return {
    '@context': SCHEMA,
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    name: input.name,
    description: clampDescription(input.description, 300),
    url,
    inLanguage: localeDefinition(locale).tag,
    isPartOf: { '@id': `${origin}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: input.items.length,
      itemListElement: input.items.map((item, index) => ({
        '@type': 'ListItem',
        position: offset + index + 1,
        name: item.name,
        url: absoluteUrl(origin, locale, item.path),
      })),
    },
  }
}

/**
 * A measured interaction count.
 *
 * The one place schema.org lets a registry state popularity without asserting a
 * rating nobody gave.
 */
export function interactionLd(action: string, count: number): Ld {
  return {
    '@type': 'InteractionCounter',
    interactionType: `${SCHEMA}/${action}`,
    userInteractionCount: count,
  }
}
