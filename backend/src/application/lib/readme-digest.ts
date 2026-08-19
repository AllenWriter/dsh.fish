/**
 * Bump when the model or translation policy changes.
 *
 * Including the revision in the digest makes every earlier generated README
 * stale immediately, so a backfill cannot accidentally keep output from a
 * previous provider or prompt.
 */
export const README_TRANSLATION_POLICY_VERSION = 'opencode-go-deepseek-v4-flash-v1'

/** Stable identity for the exact README bytes and translation policy. */
export async function readmeDigest(markdown: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${README_TRANSLATION_POLICY_VERSION}\0${markdown}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
