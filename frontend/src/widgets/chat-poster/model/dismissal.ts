/**
 * Client-only dismissal for the chat invitation poster.
 *
 * localStorage is enough: the poster is an aside, not something the server
 * needs to keep out of the HTML for correctness. Reading it only after mount
 * avoids a hydration mismatch.
 */
export const CHAT_POSTER_STORAGE_KEY = 'xiaojuren.chat-poster.dismissed'

export function readChatPosterDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(CHAT_POSTER_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeChatPosterDismissed(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CHAT_POSTER_STORAGE_KEY, '1')
  } catch {
    // Private mode or a full quota — failing closed just means the poster
    // may return next visit; never throw from a dismiss click.
  }
}
