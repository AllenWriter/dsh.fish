/**
 * GA4 measurement IDs are `G-` followed by A–Z and digits. Anything else is
 * rejected so an inline gtag snippet cannot interpolate an untrusted string.
 */
export const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/

/**
 * Read a GA4 measurement ID from Worker env.
 *
 * Blank or unset is a deliberate off switch (local/e2e, or a preview that
 * should not send hits). A value that is present but not a GA4 id is a
 * misconfiguration and fails loudly.
 */
export function parseGaMeasurementId(raw: string | undefined): string | undefined {
  const value = raw?.trim()
  if (value === undefined || value === '') {
    return undefined
  }
  if (!GA_MEASUREMENT_ID_PATTERN.test(value)) {
    throw new Error(`GA_MEASUREMENT_ID must be a GA4 measurement id (G-…).`)
  }
  return value
}

/**
 * Production HTML is the only document that may load gtag. Local `react-router
 * dev` and the Playwright server both run with `import.meta.env.PROD ===
 * false`, so they cannot send hits into the production property even when
 * `wrangler.jsonc` defines the id for deploys.
 */
export function analyticsIdForDocument(
  raw: string | undefined,
  isProduction: boolean,
): string | undefined {
  const id = parseGaMeasurementId(raw)
  return isProduction ? id : undefined
}
