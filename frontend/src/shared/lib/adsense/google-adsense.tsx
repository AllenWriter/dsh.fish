import { adsenseLoaderSrc } from './loader'

/**
 * Official AdSense Auto ads snippet, plus the account meta Google uses to
 * verify the site when it crawls the HTML.
 *
 * The script is `async` and `crossorigin="anonymous"` as Google ships it:
 * `async` keeps it off the critical path; `crossorigin` matches the CORS
 * mode of the preload so the browser does not discard the request. It belongs
 * in `<head>` of every page — Auto ads then place units from the account
 * settings, without per-page `<ins>` tags.
 */
export function GoogleAdsense({ publisherId }: { publisherId: string }) {
  const src = adsenseLoaderSrc(publisherId)

  return (
    <>
      <meta name="google-adsense-account" content={publisherId} />
      <script async src={src} crossOrigin="anonymous" />
    </>
  )
}
