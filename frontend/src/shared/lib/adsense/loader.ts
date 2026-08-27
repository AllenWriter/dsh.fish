import { parseAdsensePublisherId } from './publisher-id'

/**
 * Google's ads.txt certification authority ID for AdSense. Every publisher
 * uses this same token; the publisher ID is what varies.
 *
 * @see https://support.google.com/adsense/answer/12171612
 */
export const GOOGLE_ADS_TXT_CERTIFICATION_AUTHORITY_ID = 'f08c47fec0942fa0'

export function adsenseLoaderSrc(publisherId: string): string {
  const id = requirePublisherId(publisherId)
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(id)}`
}

/**
 * IAB ads.txt record authorizing Google to sell this site's inventory.
 *
 * The file lives at the origin root (`/ads.txt`) and uses the `pub-` form,
 * not the `ca-pub-` client parameter the script tag carries.
 */
export function adsTxtBody(publisherId: string): string {
  const id = requirePublisherId(publisherId)
  const seller = id.replace(/^ca-/, '')
  return `google.com, ${seller}, DIRECT, ${GOOGLE_ADS_TXT_CERTIFICATION_AUTHORITY_ID}\n`
}

function requirePublisherId(raw: string): string {
  const id = parseAdsensePublisherId(raw)
  if (id === undefined) {
    throw new Error('ADSENSE_PUBLISHER_ID is required to emit the AdSense snippet.')
  }
  return id
}
