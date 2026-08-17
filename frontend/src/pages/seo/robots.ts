import type { Route } from './+types/robots'
import { hubContext } from '@/shared/api/hub-context'

/**
 * `/robots.txt`.
 *
 * The disallow list is the set of paths that are already `noindex` in their own
 * head tags — stated twice on purpose, because the two mechanisms do different
 * jobs. `noindex` keeps a page out of the index but only after it is fetched;
 * `Disallow` stops the fetch, which is what protects the crawl budget of a
 * catalog whose account pages are worth nothing to a crawler.
 *
 * `/api/` is disallowed for the same reason: it answers JSON, and a crawler
 * enumerating it learns nothing the HTML pages do not already say.
 *
 * Nothing here is a security boundary. robots.txt is a request, and the paths
 * it names are exactly the paths anyone can read in it.
 */
export function loader({ context }: Route.LoaderArgs) {
  const { baseUrl } = context.get(hubContext).container.config

  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /dashboard',
    'Disallow: /device',
    'Disallow: /sign-in',
    // The same three under every language prefix. A crawler matches these as
    // prefixes, so one wildcard line covers all ten.
    'Disallow: /*/dashboard',
    'Disallow: /*/device',
    'Disallow: /*/sign-in',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  })
}
