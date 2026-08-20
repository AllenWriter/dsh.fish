/**
 * Display-clock math for model-native streaming text.
 *
 * Arrival (SSE) and paint are different clocks. Transport may deliver a 150 ms
 * batch in one message; dumping that batch on the next animation frame still
 * looks like a jump. This module answers "how many graphemes this frame"
 * from the unrendered backlog, using real elapsed time so 60 Hz and 120 Hz
 * cover the same wall-clock progress.
 */

export const CATCH_UP_SECONDS = 0.25
export const MIN_RATE_PER_SECOND = 20
export const MAX_RATE_PER_SECOND = 800
export const MAX_PENDING_GRAPHENES = 4096
export const MAX_EMIT_PER_FRAME = 512
export const HIDDEN_DRAIN_MS = 50

export interface DisplayClockCounts {
  readonly received: number
  readonly rendered: number
  readonly budget: number
}

const empty: DisplayClockCounts = { received: 0, rendered: 0, budget: 0 }

let graphemeSegmenter: Intl.Segmenter | undefined
let graphemeSegmenterFailed = false

function getGraphemeSegmenter(): Intl.Segmenter | undefined {
  if (graphemeSegmenterFailed) return undefined
  if (graphemeSegmenter) return graphemeSegmenter
  try {
    graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return graphemeSegmenter
  } catch {
    graphemeSegmenterFailed = true
    return undefined
  }
}

/** Split once at enqueue. Prefers grapheme clusters; falls back to code points. */
export function segmentGraphemes(text: string): string[] {
  if (text === '') return []
  const segmenter = getGraphemeSegmenter()
  if (segmenter) {
    try {
      const parts: string[] = []
      for (const { segment } of segmenter.segment(text)) parts.push(segment)
      return parts
    } catch {
      graphemeSegmenterFailed = true
    }
  }
  return [...text]
}

export function displayRate(pending: number): number {
  if (pending <= 0) return 0
  return Math.min(MAX_RATE_PER_SECOND, Math.max(MIN_RATE_PER_SECOND, pending / CATCH_UP_SECONDS))
}

export function flushDisplayClock(state: DisplayClockCounts): DisplayClockCounts {
  if (state.rendered === state.received && state.budget === 0) return state
  return { received: state.received, rendered: state.received, budget: 0 }
}

/**
 * Advance the display clock by `elapsedSeconds` of wall time.
 *
 * Backlog above {@link MAX_PENDING_GRAPHENES} flushes: freshness beats smoothness.
 * Fractional budget carries to the next frame. One tick emits at most
 * {@link MAX_EMIT_PER_FRAME} graphemes.
 */
export function tickDisplayClock(
  state: DisplayClockCounts,
  elapsedSeconds: number,
): DisplayClockCounts {
  const pending = state.received - state.rendered
  if (pending <= 0) {
    return state.budget === 0 ? state : { ...state, budget: 0 }
  }
  if (pending > MAX_PENDING_GRAPHENES) return flushDisplayClock(state)

  const elapsed = Math.max(0, elapsedSeconds)
  const nextBudget = state.budget + displayRate(pending) * elapsed
  const emit = Math.min(pending, MAX_EMIT_PER_FRAME, Math.floor(nextBudget))
  return {
    received: state.received,
    rendered: state.rendered + emit,
    budget: nextBudget - emit,
  }
}

export function emptyDisplayClock(): DisplayClockCounts {
  return empty
}
