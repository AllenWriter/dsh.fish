import { index, route, type RouteConfig } from '@react-router/dev/routes'

/**
 * Route table.
 *
 * Paths are relative to `appDirectory` (`src`), so each entry points at the
 * `pages` slice that owns it. A page composes widgets and features and reads
 * routing data — it holds no business logic of its own.
 */
export default [
  index('./pages/home/home-page.tsx'),
  route('browse', './pages/browse/browse-page.tsx'),
  route('a/:artifactId', './pages/artifact-detail/artifact-detail-page.tsx'),
  route('submit', './pages/submit/submit-page.tsx'),
  route('dashboard', './pages/dashboard/dashboard-page.tsx'),
  route('sign-in', './pages/sign-in/sign-in-page.tsx'),
  // The device grant's verification page. `verification_uri_complete` links
  // straight here with the code prefilled.
  route('device', './pages/device/device-page.tsx'),
  route('docs', './pages/docs/docs-page.tsx'),
  route('*', './pages/not-found/not-found-page.tsx'),
] satisfies RouteConfig
