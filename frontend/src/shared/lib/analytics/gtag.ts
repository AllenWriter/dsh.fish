import { parseGaMeasurementId } from './measurement-id'

export interface PageView {
  readonly path: string
  readonly title: string
  readonly href: string
}

export function gtagLoaderSrc(measurementId: string): string {
  const id = requireMeasurementId(measurementId)
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
}

/**
 * Official gtag bootstrap, with automatic first `page_view` disabled.
 *
 * React Router navigations do not reload the document, so every view —
 * including the landing one — is sent from `sendPageView` after the URL and
 * title are the ones the reader is actually looking at. Leaving the default
 * on would double-count the first page once the SPA listener also fires.
 */
export function gtagBootstrapSnippet(measurementId: string): string {
  const id = requireMeasurementId(measurementId)
  return [
    'window.dataLayer=window.dataLayer||[];',
    'function gtag(){dataLayer.push(arguments);}',
    "gtag('js',new Date());",
    `gtag('config','${id}',{send_page_view:false});`,
  ].join('')
}

export function pageViewParams(page: PageView): Record<string, string> {
  return {
    page_path: page.path,
    page_title: page.title,
    page_location: page.href,
  }
}

/**
 * Queue a GA4 `page_view`. `gtag` is the stub the bootstrap snippet installs
 * immediately, so this still works while gtag.js itself is in flight. When an
 * ad blocker removed the stub, there is nothing to send to.
 */
export function sendPageView(page: PageView): void {
  const gtag = globalThis.window?.gtag
  if (typeof gtag !== 'function') {
    return
  }
  gtag('event', 'page_view', pageViewParams(page))
}

function requireMeasurementId(raw: string): string {
  const id = parseGaMeasurementId(raw)
  if (id === undefined) {
    throw new Error('GA_MEASUREMENT_ID is required to emit the gtag snippet.')
  }
  return id
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}
