import type { MessageKey } from '@/shared/config/i18n'

/**
 * The pool of openers offered before a reader has asked anything.
 *
 * Every entry has to hold for any GitHub-sourced plugin, because nothing here
 * knows which repository it will be shown on. A question that only makes sense
 * for, say, a bundle would render as noise on a skill.
 */
export const SUGGESTED_QUESTION_KEYS: readonly MessageKey[] = [
  'ask.suggested.q1',
  'ask.suggested.q2',
  'ask.suggested.q3',
  'ask.suggested.q4',
  'ask.suggested.q5',
  'ask.suggested.q6',
  'ask.suggested.q7',
  'ask.suggested.q8',
  'ask.suggested.q9',
  'ask.suggested.q10',
  'ask.suggested.q11',
  'ask.suggested.q12',
]

/** How many of the pool a reader sees at once. Three fits the rail without scrolling. */
export const SUGGESTED_QUESTION_COUNT = 3

/** FNV-1a: a short, well-mixed hash so neighbouring seeds do not pick alike. */
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32: 32 bits of state, uniform enough for shuffling a dozen strings. */
function randomFrom(state: number): () => number {
  let value = state >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let mixed = value
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 0x100000000
  }
}

/**
 * Draw `count` distinct questions for `seed`.
 *
 * Seeded rather than `Math.random` because the card renders on the server too:
 * an unseeded draw would disagree with the client and fail hydration. The same
 * plugin therefore always opens on the same three questions, and asking for a
 * different set is a matter of passing a different seed.
 */
export function pickSuggestedQuestions(
  seed: string,
  count: number = SUGGESTED_QUESTION_COUNT,
): MessageKey[] {
  const next = randomFrom(hashSeed(seed))
  return SUGGESTED_QUESTION_KEYS.map((key) => ({ key, order: next() }))
    .sort((left, right) => left.order - right.order)
    .slice(0, Math.max(0, Math.min(count, SUGGESTED_QUESTION_KEYS.length)))
    .map((entry) => entry.key)
}
