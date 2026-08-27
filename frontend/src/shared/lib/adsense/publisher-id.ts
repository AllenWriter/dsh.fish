/**
 * AdSense publisher IDs are `ca-pub-` followed by 16 digits. Anything else is
 * rejected so the loader URL and the verification meta cannot interpolate an
 * untrusted string.
 */
export const ADSENSE_PUBLISHER_ID_PATTERN = /^ca-pub-\d{16}$/

/**
 * Read an AdSense publisher ID from Worker env.
 *
 * Blank or unset is a deliberate off switch (local/e2e, or a preview that
 * should not serve ads). A value that is present but not a publisher id is a
 * misconfiguration and fails loudly.
 */
export function parseAdsensePublisherId(raw: string | undefined): string | undefined {
  const value = raw?.trim()
  if (value === undefined || value === '') {
    return undefined
  }
  if (!ADSENSE_PUBLISHER_ID_PATTERN.test(value)) {
    throw new Error(
      'ADSENSE_PUBLISHER_ID must be an AdSense publisher id (ca-pub- followed by 16 digits).',
    )
  }
  return value
}

/**
 * Production HTML is the only document that may load adsbygoogle. Local
 * `react-router dev` and the Playwright server both run with
 * `import.meta.env.PROD === false`, so they cannot request ads against the
 * production publisher even when `wrangler.jsonc` defines the id for deploys.
 */
export function adsensePublisherIdForDocument(
  raw: string | undefined,
  isProduction: boolean,
): string | undefined {
  const id = parseAdsensePublisherId(raw)
  return isProduction ? id : undefined
}
