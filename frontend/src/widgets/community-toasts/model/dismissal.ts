/**
 * Which community toasts a reader has already retired.
 *
 * Stored in a cookie rather than `localStorage`, for the same reason the theme
 * is (`shared/lib/theme.ts`): the server can read a cookie. That is what lets
 * the root loader decide whether the surface exists at all, so a reader who
 * dismissed a toast last week never gets it re-rendered and hidden again on
 * the client — and it keeps this module free of storage that throws when a
 * browser has it turned off.
 *
 * The value is a dot-joined list of ids. RFC 6265 excludes commas, semicolons
 * and whitespace from an unquoted cookie value, and a separator that cannot
 * appear in an id means reading it back can never fail to parse.
 */

/** Every toast this widget can show, in the order they arrive. */
export const COMMUNITY_TOAST_IDS = ['discord', 'x', 'feedback'] as const

export type CommunityToastId = (typeof COMMUNITY_TOAST_IDS)[number]

export const COMMUNITY_COOKIE = 'community'

const SEPARATOR = '.'

/** One year, like the theme: a dismissal should outlive a browser restart. */
const MAX_AGE_SECONDS = 31_536_000

function isCommunityToastId(value: string): value is CommunityToastId {
  return (COMMUNITY_TOAST_IDS as readonly string[]).includes(value)
}

/**
 * Read the dismissed set from a request's `Cookie` header.
 *
 * Ids the current build no longer knows are dropped rather than carried, so
 * renaming a toast retires the old name instead of preserving a dead one.
 */
export function readDismissedToasts(header: string | null): readonly CommunityToastId[] {
  if (!header) return []
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name !== COMMUNITY_COOKIE) continue
    return rest.join('=').split(SEPARATOR).filter(isCommunityToastId)
  }
  return []
}

/** Persist the dismissed set. Browser-only: it writes `document.cookie`. */
export function writeDismissedToasts(ids: readonly CommunityToastId[]): void {
  const value = [...new Set(ids)].join(SEPARATOR)
  document.cookie = `${COMMUNITY_COOKIE}=${value};path=/;max-age=${MAX_AGE_SECONDS};samesite=lax`
}
