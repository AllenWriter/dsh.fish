import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { GoogleAdsense } from './google-adsense'
import { adsTxtBody, adsenseLoaderSrc, GOOGLE_ADS_TXT_CERTIFICATION_AUTHORITY_ID } from './loader'
import { adsensePublisherIdForDocument, parseAdsensePublisherId } from './publisher-id'

const PRODUCTION_ID = 'ca-pub-4028911961301674'

describe('parseAdsensePublisherId', () => {
  it('accepts a publisher id, trimming surrounding space', () => {
    expect(parseAdsensePublisherId(`  ${PRODUCTION_ID}  `)).toBe(PRODUCTION_ID)
  })

  it('treats a blank value as ads off', () => {
    expect(parseAdsensePublisherId(undefined)).toBeUndefined()
    expect(parseAdsensePublisherId('')).toBeUndefined()
    expect(parseAdsensePublisherId('   ')).toBeUndefined()
  })

  it('rejects anything that is not a publisher id', () => {
    expect(() => parseAdsensePublisherId('pub-4028911961301674')).toThrow(/AdSense/)
    expect(() => parseAdsensePublisherId('ca-pub-123')).toThrow(/AdSense/)
    expect(() => parseAdsensePublisherId(`${PRODUCTION_ID}';alert(1)//`)).toThrow(/AdSense/)
  })
})

describe('adsensePublisherIdForDocument', () => {
  it('emits the id only on a production build', () => {
    expect(adsensePublisherIdForDocument(PRODUCTION_ID, true)).toBe(PRODUCTION_ID)
    expect(adsensePublisherIdForDocument(PRODUCTION_ID, false)).toBeUndefined()
    expect(adsensePublisherIdForDocument(undefined, true)).toBeUndefined()
  })
})

describe('adsbygoogle snippet', () => {
  it('loads adsbygoogle.js for the validated client', () => {
    expect(adsenseLoaderSrc(PRODUCTION_ID)).toBe(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PRODUCTION_ID}`,
    )
  })

  it('refuses to interpolate an unvalidated id into the loader URL', () => {
    expect(() => adsenseLoaderSrc(`</script><script>alert(1)`)).toThrow(/AdSense/)
  })
})

describe('ads.txt', () => {
  it('authorizes Google with the pub- seller and Google\'s CA id', () => {
    expect(adsTxtBody(PRODUCTION_ID)).toBe(
      `google.com, pub-4028911961301674, DIRECT, ${GOOGLE_ADS_TXT_CERTIFICATION_AUTHORITY_ID}\n`,
    )
  })
})

describe('GoogleAdsense markup', () => {
  it('emits the official loader, CORS mode, and account meta', () => {
    const html = renderToStaticMarkup(<GoogleAdsense publisherId={PRODUCTION_ID} />)
    expect(html).toContain(`src="${adsenseLoaderSrc(PRODUCTION_ID)}"`)
    expect(html).toContain('crossorigin="anonymous"')
    expect(html).toContain(`<meta name="google-adsense-account" content="${PRODUCTION_ID}"/>`)
  })
})

describe('Worker configuration', () => {
  it('pins the production publisher id as a public wrangler var', () => {
    const source = readFileSync(new URL('../../../../wrangler.jsonc', import.meta.url), 'utf8')
    expect(source).toMatch(new RegExp(`"ADSENSE_PUBLISHER_ID": "${PRODUCTION_ID}"`))
  })
})
