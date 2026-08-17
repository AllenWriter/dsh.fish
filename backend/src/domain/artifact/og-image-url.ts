import { DomainError } from '../shared/error.js'

/**
 * Hosts GitHub uses for a repository's Open Graph image.
 *
 * `repository-images.githubusercontent.com` is an author-uploaded Social
 * preview. `opengraph.githubassets.com` is the card GitHub generates when
 * none was uploaded. The owner's avatar is neither, and is rejected.
 */
export const OG_IMAGE_HOSTS = [
  'repository-images.githubusercontent.com',
  'opengraph.githubassets.com',
] as const

const MAX_LENGTH = 500
const SEGMENT = /^[A-Za-z0-9_.-]{1,100}$/

/**
 * Accept a GitHub repository social-preview URL, or throw.
 *
 * The catalog only stores URLs GitHub itself would emit for a repository
 * Social preview. An arbitrary `https:` image would let a submission paint
 * a tracking pixel onto every catalog card.
 */
export function ogImageUrl(value: string): string {
  const parsed = tryOgImageUrl(value)
  if (parsed === undefined) {
    throw DomainError.invalid('Not a GitHub repository social-preview URL.', { value })
  }
  return parsed
}

/** Same check as `ogImageUrl`, for callers that prefer to omit a bad URL. */
export function tryOgImageUrl(value: string): string | undefined {
  if (value.length === 0 || value.length > MAX_LENGTH) return undefined
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return undefined
  }
  if (parsed.protocol !== 'https:') return undefined
  parsed.hash = ''

  if (parsed.hostname === 'repository-images.githubusercontent.com') {
    return parsed.pathname.length > 1 ? parsed.toString() : undefined
  }

  if (parsed.hostname === 'opengraph.githubassets.com') {
    const parts = parsed.pathname.split('/').filter((part) => part !== '')
    // /{cache-key}/{owner}/{repo}
    if (parts.length !== 3 || parts.some((part) => !SEGMENT.test(part))) return undefined
    parsed.search = ''
    return parsed.toString()
  }

  return undefined
}

/**
 * The card GitHub generates for a repository that has no uploaded Social
 * preview. `cacheKey` busts GitHub's CDN when the default branch moves.
 */
export function generatedOgImageUrl(owner: string, repo: string, cacheKey = 'preview'): string {
  const key = typeof cacheKey === 'string' && SEGMENT.test(cacheKey) ? cacheKey : 'preview'
  return `https://opengraph.githubassets.com/${key}/${owner}/${repo}`
}
