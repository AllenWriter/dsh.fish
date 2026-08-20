import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { gtagBootstrapSnippet, gtagLoaderSrc, sendPageView } from './gtag'

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  useSpaPageViews()

  return (
    <>
      <script async src={gtagLoaderSrc(measurementId)} />
      <script dangerouslySetInnerHTML={{ __html: gtagBootstrapSnippet(measurementId) }} />
    </>
  )
}

/**
 * One `page_view` per client-side location, including the first mount.
 *
 * The bootstrap snippet disables gtag's automatic view so this is the only
 * writer. `useEffect` runs after Meta has committed the new `<title>`, which
 * is what stops SPA hits from carrying the previous page's title.
 */
function useSpaPageViews(): void {
  const location = useLocation()
  const path = `${location.pathname}${location.search}`
  const seen = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (seen.current === path) {
      return
    }
    seen.current = path
    sendPageView({
      path,
      title: document.title,
      href: window.location.href,
    })
  }, [path])
}
