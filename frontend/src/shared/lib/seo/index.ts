/** Public API of the SEO helpers. */
export { pageMeta, documentLanguage, errorMeta, type PageMetaInput } from './meta'
export { absoluteUrl, alternates, clampDescription, hreflangFor, type Alternate } from './url'
export {
  SCHEMA,
  breadcrumbLd,
  collectionLd,
  interactionLd,
  organizationLd,
  websiteLd,
  type Crumb,
  type Ld,
  type ListedItem,
} from './structured-data'
