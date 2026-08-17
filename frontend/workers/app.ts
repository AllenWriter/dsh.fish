import { createRequestHandler, RouterContextProvider } from 'react-router'
import { createApiApp } from '@dsh-fish/backend'
import { createContainer } from '@dsh-fish/backend/infrastructure/container.js'
import type { HubEnv } from '@dsh-fish/backend/infrastructure/config/env.js'
import { hubContext } from '@/shared/api/hub-context'
import { canonicalLocaleRedirect } from '@/shared/config/i18n'

/**
 * The Worker entry. One deployment serves both halves of the product.
 *
 * The API and the UI share an origin deliberately: Better Auth's session cookie
 * then needs no cross-subdomain configuration, the browser makes no preflight
 * request before a search, and a plugin page is server-rendered by code that
 * can call the use cases directly instead of round-tripping through HTTP.
 */
const api = createApiApp()

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      return api.fetch(request, env, ctx)
    }

    // One document, one URL. `/en/browse` duplicates `/browse`, and `/ZH-cn`
    // duplicates `/zh-CN` to a router that matches case-insensitively; both are
    // folded into the canonical form before routing, permanently, so a crawler
    // that ever saw the other form drops it.
    const canonical = canonicalLocaleRedirect(url.pathname, url.search)
    if (canonical !== undefined) {
      return Response.redirect(new URL(canonical, url.origin).toString(), 301)
    }

    // Loaders resolve use cases in-process. A server-rendered page therefore
    // costs one D1 round trip, not an HTTP hop back into the same Worker.
    const routerContext = new RouterContextProvider()
    routerContext.set(hubContext, {
      container: createContainer(env, request.cf),
      env,
      ctx,
    })

    return requestHandler(request, routerContext)
  },

  /**
   * Cron trigger. Refreshes the catalog from the GitHub `dsh-plugin` topic and
   * from npm, so the registry stays current without anyone submitting anything.
   *
   * The limits are a subrequest budget, not a taste: a Worker invocation may
   * make 1000 subrequests, and one run costs roughly 200 GitHub repositories ×
   * up to 3 probes (plus 2 search pages and a handful of extra reads per
   * repository that actually classifies) and 100 npm packages × 2. The GitHub
   * sweep resumes from a stored page each run rather than re-reading the head
   * of the topic, so the whole reachable result set is covered across runs.
   */
  async scheduled(_controller, env, ctx) {
    const container = createContainer(env)
    ctx.waitUntil(
      container.useCases.ingestCatalog
        .execute({ limitPerSource: 100, limitByOrigin: { github: 200 } })
        .then((report) => {
          console.log('catalog_ingest', report)
        })
        .catch((error: unknown) => {
          console.error('catalog_ingest_failed', String(error))
        }),
    )
  },
} satisfies ExportedHandler<HubEnv>
