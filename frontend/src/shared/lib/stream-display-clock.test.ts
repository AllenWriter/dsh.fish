import { describe, expect, it } from 'vitest'
import {
  CATCH_UP_SECONDS,
  MAX_EMIT_PER_FRAME,
  MAX_PENDING_GRAPHENES,
  MAX_RATE_PER_SECOND,
  MIN_RATE_PER_SECOND,
  displayRate,
  emptyDisplayClock,
  flushDisplayClock,
  segmentGraphemes,
  tickDisplayClock,
} from './stream-display-clock'

function withReceived(received: number, rendered = 0, budget = 0) {
  return { received, rendered, budget }
}

function renderedAfter(hz: number, seconds: number, pending: number): number {
  const dt = 1 / hz
  const frames = Math.round(seconds * hz)
  let state = withReceived(pending)
  for (let frame = 0; frame < frames; frame += 1) {
    state = tickDisplayClock(state, dt)
  }
  return state.rendered
}

describe('segmentGraphemes', () => {
  it('keeps a ZWJ family emoji as one cluster', () => {
    const family = '👨‍👩‍👧‍👦'
    expect(segmentGraphemes(family)).toEqual([family])
    expect(family.length).toBeGreaterThan(1)
  })

  it('splits CJK by code point / grapheme, not UTF-16 pairs', () => {
    expect(segmentGraphemes('你好')).toEqual(['你', '好'])
  })

  it('does not split a surrogate-pair emoji on the code-point fallback path', () => {
    expect(segmentGraphemes('🙂').join('')).toBe('🙂')
  })
})

describe('displayRate', () => {
  it('clamps to 20–800 graphemes per second from pending / 0.25s', () => {
    expect(displayRate(0)).toBe(0)
    expect(displayRate(1)).toBe(MIN_RATE_PER_SECOND)
    expect(displayRate(5)).toBe(MIN_RATE_PER_SECOND)
    expect(displayRate(100)).toBe(100 / CATCH_UP_SECONDS)
    expect(displayRate(1000)).toBe(MAX_RATE_PER_SECOND)
  })
})

describe('tickDisplayClock', () => {
  it('carries a fractional budget until a whole grapheme is due', () => {
    let state = withReceived(1)
    state = tickDisplayClock(state, 0.01)
    expect(state.rendered).toBe(0)
    expect(state.budget).toBeCloseTo(MIN_RATE_PER_SECOND * 0.01)
    state = tickDisplayClock(state, 0.04)
    expect(state.rendered).toBe(1)
    expect(state.budget).toBeCloseTo(MIN_RATE_PER_SECOND * 0.05 - 1)
  })

  it('covers the same wall-clock progress at 60 Hz and 120 Hz', () => {
    const pending = 100
    const seconds = CATCH_UP_SECONDS
    const at60 = renderedAfter(60, seconds, pending)
    const at120 = renderedAfter(120, seconds, pending)
    expect(Math.abs(at60 - at120)).toBeLessThan(3)
    // rate = pending / 0.25s, so a quarter-second is one time constant:
    // about 1 − 1/e of the backlog, not a full drain.
    expect(at60).toBeGreaterThan(pending * (1 - Math.E ** -1) - 5)
    expect(at60).toBeLessThan(pending)
  })

  it('flushes when the backlog is out of control', () => {
    const state = tickDisplayClock(withReceived(MAX_PENDING_GRAPHENES + 1), 1 / 60)
    expect(state.rendered).toBe(MAX_PENDING_GRAPHENES + 1)
    expect(state.budget).toBe(0)
  })

  it('caps a single frame so a long hitch cannot dump the stream', () => {
    const state = tickDisplayClock(withReceived(4000), 2)
    expect(state.rendered).toBe(MAX_EMIT_PER_FRAME)
  })

  it('flush snaps to the received head and drops leftover budget', () => {
    expect(flushDisplayClock(withReceived(40, 3, 0.8))).toEqual({
      received: 40,
      rendered: 40,
      budget: 0,
    })
  })

  it('starts from an empty clock', () => {
    expect(emptyDisplayClock()).toEqual({ received: 0, rendered: 0, budget: 0 })
  })
})
