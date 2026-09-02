import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { GoogleAnalytics } from './google-analytics'
import { gtagBootstrapSnippet, gtagLoaderSrc, pageViewParams, sendPageView } from './gtag'
import { analyticsIdForDocument, parseGaMeasurementId } from './measurement-id'

const PRODUCTION_ID = 'G-FESCMWFD5J'

describe('parseGaMeasurementId', () => {
  it('accepts a GA4 measurement id, trimming surrounding space', () => {
    expect(parseGaMeasurementId(`  ${PRODUCTION_ID}  `)).toBe(PRODUCTION_ID)
  })

  it('treats a blank value as tracking off', () => {
    expect(parseGaMeasurementId(undefined)).toBeUndefined()
    expect(parseGaMeasurementId('')).toBeUndefined()
    expect(parseGaMeasurementId('   ')).toBeUndefined()
  })

  it('rejects anything that is not a GA4 measurement id', () => {
    expect(() => parseGaMeasurementId('UA-123')).toThrow(/GA4/)
    expect(() => parseGaMeasurementId('G-abc')).toThrow(/GA4/)
    expect(() => parseGaMeasurementId(`${PRODUCTION_ID}';alert(1)//`)).toThrow(/GA4/)
  })
})

describe('analyticsIdForDocument', () => {
  it('emits the id only on a production build', () => {
    expect(analyticsIdForDocument(PRODUCTION_ID, true)).toBe(PRODUCTION_ID)
    expect(analyticsIdForDocument(PRODUCTION_ID, false)).toBeUndefined()
    expect(analyticsIdForDocument(undefined, true)).toBeUndefined()
  })
})

describe('gtag snippet', () => {
  it('loads gtag.js for the validated id', () => {
    expect(gtagLoaderSrc(PRODUCTION_ID)).toBe(
      `https://www.googletagmanager.com/gtag/js?id=${PRODUCTION_ID}`,
    )
  })

  it('configures gtag without an automatic first page_view', () => {
    const snippet = gtagBootstrapSnippet(PRODUCTION_ID)
    expect(snippet).toContain(`gtag('config','${PRODUCTION_ID}',{send_page_view:false})`)
    expect(snippet).toContain('window.dataLayer=window.dataLayer||[]')
  })

  it('refuses to interpolate an unvalidated id into the inline script', () => {
    expect(() => gtagBootstrapSnippet(`</script><script>alert(1)`)).toThrow(/GA4/)
  })
})

describe('page views', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the URL the reader is on, not the previous document title by itself', () => {
    expect(
      pageViewParams({
        path: '/ja/browse?q=git',
        title: 'Browse — dsh.fish',
        href: 'https://dsh.fish/ja/browse?q=git',
      }),
    ).toEqual({
      page_path: '/ja/browse?q=git',
      page_title: 'Browse — dsh.fish',
      page_location: 'https://dsh.fish/ja/browse?q=git',
    })
  })

  it('queues a page_view when the bootstrap stub is present', () => {
    const gtag = vi.fn()
    vi.stubGlobal('window', { gtag })
    sendPageView({
      path: '/docs',
      title: 'Docs',
      href: 'https://dsh.fish/docs',
    })
    expect(gtag).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/docs',
      page_title: 'Docs',
      page_location: 'https://dsh.fish/docs',
    })
  })

  it('does nothing when an ad blocker removed gtag', () => {
    vi.stubGlobal('window', {})
    expect(() =>
      sendPageView({ path: '/', title: 'dsh.fish', href: 'https://dsh.fish/' }),
    ).not.toThrow()
  })
})

describe('GoogleAnalytics markup', () => {
  it('emits the official loader and bootstrap for the measurement id', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <GoogleAnalytics measurementId={PRODUCTION_ID} />
      </MemoryRouter>,
    )
    expect(html).toContain(`src="${gtagLoaderSrc(PRODUCTION_ID)}"`)
    expect(html).toContain(gtagBootstrapSnippet(PRODUCTION_ID))
  })
})

describe('Worker configuration', () => {
  it('pins the production measurement id as a public wrangler var', () => {
    const source = readFileSync(new URL('../../../../wrangler.jsonc', import.meta.url), 'utf8')
    expect(source).toMatch(new RegExp(`"GA_MEASUREMENT_ID": "${PRODUCTION_ID}"`))
  })
})
