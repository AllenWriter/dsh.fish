/**
 * A GitHub identity's portrait, derived from a profile URL.
 *
 * GitHub documents `https://github.com/{login}.png` as the public avatar for
 * a user or organisation. Nothing here stores a second image URL — an
 * arbitrary `https:` portrait would let a submission paint a tracker onto
 * every plugin page, the same reason Social previews are host-allowlisted.
 * Constructing this from a profile that is already linked keeps the portrait
 * and the outbound link the same fact.
 *
 * Shared rather than owned by the artifact entity, because two surfaces show
 * a GitHub face now: a plugin's author card, and the maintainer in the
 * community stack.
 */

const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/

function githubProfileLogin(profileUrl: string): string | undefined {
  let parsed: URL
  try {
    parsed = new URL(profileUrl)
  } catch {
    return undefined
  }
  if (parsed.protocol !== 'https:') return undefined
  const host = parsed.hostname === 'www.github.com' ? 'github.com' : parsed.hostname
  if (host !== 'github.com') return undefined
  const [login, ...rest] = parsed.pathname.split('/').filter((part) => part !== '')
  if (rest.length > 0 || login === undefined || !GITHUB_LOGIN.test(login)) return undefined
  return login
}

/** The GitHub login a profile URL names, when the URL is a profile and not a repo. */
export function githubLogin(profileUrl: string | undefined): string | undefined {
  return profileUrl === undefined ? undefined : githubProfileLogin(profileUrl)
}

/**
 * Portrait for a GitHub profile URL.
 *
 * `size` is CSS pixels at 1×; GitHub serves a square PNG. Absent when the URL
 * is missing, not GitHub, or not a single-segment profile.
 */
export function githubAvatarUrl(profileUrl: string | undefined, size = 128): string | undefined {
  const login = githubLogin(profileUrl)
  return login === undefined ? undefined : `https://github.com/${login}.png?size=${size}`
}
