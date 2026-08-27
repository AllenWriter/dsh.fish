import type { Route } from './+types/ads-txt'
import { hubContext } from '@/shared/api/hub-context'
import { adsTxtBody, parseAdsensePublisherId } from '@/shared/lib/adsense'

/**
 * `/ads.txt` — IAB authorized digital sellers, as AdSense requires it.
 *
 * One origin, one file, no locale prefix. Buyers fetch this path on the
 * registrable domain; a missing or malformed record is treated as
 * unauthorized inventory, not as an optional extra.
 */
export function loader({ context }: Route.LoaderArgs) {
  const publisherId = parseAdsensePublisherId(context.get(hubContext).env.ADSENSE_PUBLISHER_ID)
  if (publisherId === undefined) {
    throw new Response(null, { status: 404, statusText: 'Not Found' })
  }

  return new Response(adsTxtBody(publisherId), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  })
}
