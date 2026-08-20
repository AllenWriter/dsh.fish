import { index, route, type RouteConfig } from '@react-router/dev/routes'

/**
 * Route table.
 *
 * Paths are relative to `appDirectory` (`src`), so each entry points at the
 * `pages` slice that owns it. A page composes widgets and features and reads
 * routing data — it holds no business logic of its own.
 *
 * ## Languages
 *
 * One URL serves every language: the request's language is negotiated per
 * request (cookie, then `Accept-Language`), never carried in the path. URLs
 * from the prefixed era are folded onto the bare path at the Worker entry
 * before routing.
 *
 * ## Crawlable facets
 *
 * `/kind/:kind` and `/category/:category` exist because `/browse?kind=skill` is
 * a query string: engines crawl those reluctantly, rank them poorly, and cannot
 * tell a filter apart from a session id. The same listing under a real path is
 * an indexable landing page for the term people actually search for.
 */
export default [
  index('./pages/home/home-page.tsx'),

  route('browse', './pages/browse/browse-page.tsx'),
  route('kind/:kind', './pages/kind/kind-page.tsx'),
  route('category/:category', './pages/category/category-page.tsx'),
  route('a/:artifactId', './pages/artifact-detail/artifact-detail-page.tsx'),
  // Per-artifact assets.
  route('a/:artifactId/og.png', './pages/artifact-og/og-image.tsx'),
  route('a/:artifactId/badge.svg', './pages/artifact-badge/badge.svg.ts'),
  route('submit', './pages/submit/submit-page.tsx'),
  route('dashboard', './pages/dashboard/dashboard-page.tsx'),
  route('sign-in', './pages/sign-in/sign-in-page.tsx'),
  // The device grant's verification page. `verification_uri_complete` links
  // straight here with the code prefilled.
  route('device', './pages/device/device-page.tsx'),
  route('docs', './pages/docs/docs-page.tsx'),

  // Crawler-facing resources. One sitemap set lists every URL once.
  route('robots.txt', './pages/seo/robots.ts'),
  route('sitemap.xml', './pages/seo/sitemap-index.ts'),
  route('sitemaps/pages.xml', './pages/seo/pages-sitemap.ts'),
  route('sitemaps/artifacts/:page', './pages/seo/artifacts-sitemap.ts'),
  route('feed.xml', './pages/seo/feed.ts'),
  // Agent-discovery resources. The api-catalog (RFC 9727) and the OpenAPI
  // document are what the HTML pages' `Link` headers point at.
  route('.well-known/api-catalog', './pages/seo/api-catalog.ts'),
  route('openapi.json', './pages/seo/openapi.ts'),

  route('*', './pages/not-found/not-found-page.tsx'),
] satisfies RouteConfig
