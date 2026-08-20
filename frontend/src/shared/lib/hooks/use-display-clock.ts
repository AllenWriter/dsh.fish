import { useLayoutEffect, useReducer, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import {
  HIDDEN_DRAIN_MS,
  flushDisplayClock,
  segmentGraphemes,
  tickDisplayClock,
} from '@/shared/lib/stream-display-clock'

/**
 * Paint clock for a growing source string.
 *
 * `source` is the arrival clock (concatenated deltas). This hook holds a
 * grapheme queue segmented once on enqueue and releases it on animation
 * frames at a backlog-dependent rate. `flush` (stream ended, snapshot,
 * reduced motion) snaps the paint head to the arrival head in the same frame.
 */
export function useDisplayClock(
  source: string,
  {
    flush = false,
    resetKey,
  }: {
    flush?: boolean
    resetKey?: string
  } = {},
): string {
  const reduce = useReducedMotion() ?? false
  const immediate = flush || reduce
  const receivedRef = useRef<string[]>([])
  const renderedRef = useRef(0)
  const budgetRef = useRef(0)
  const sourceRef = useRef('')
  const resetKeyRef = useRef(resetKey)
  const [, bump] = useReducer((count: number) => count + 1, 0)

  const publish = () => {
    bump()
  }

  useLayoutEffect(() => {
    if (resetKeyRef.current !== resetKey) {
      receivedRef.current = []
      renderedRef.current = 0
      budgetRef.current = 0
      sourceRef.current = ''
      resetKeyRef.current = resetKey
    }

    if (source !== sourceRef.current) {
      if (source.startsWith(sourceRef.current)) {
        const suffix = source.slice(sourceRef.current.length)
        if (suffix !== '') receivedRef.current.push(...segmentGraphemes(suffix))
      } else {
        receivedRef.current = segmentGraphemes(source)
        renderedRef.current = 0
        budgetRef.current = 0
      }
      sourceRef.current = source
    }

    if (immediate) {
      const next = flushDisplayClock({
        received: receivedRef.current.length,
        rendered: renderedRef.current,
        budget: budgetRef.current,
      })
      const moved = next.rendered !== renderedRef.current || next.budget !== budgetRef.current
      renderedRef.current = next.rendered
      budgetRef.current = next.budget
      if (moved) publish()
    }
  }, [source, resetKey, immediate])

  useLayoutEffect(() => {
    if (immediate) return
    if (renderedRef.current >= receivedRef.current.length) return

    let raf = 0
    let interval = 0
    let last = performance.now()

    const step = (now: number): boolean => {
      const elapsed = Math.max(0, (now - last) / 1000)
      last = now
      const next = tickDisplayClock(
        {
          received: receivedRef.current.length,
          rendered: renderedRef.current,
          budget: budgetRef.current,
        },
        elapsed,
      )
      const moved = next.rendered !== renderedRef.current
      renderedRef.current = next.rendered
      budgetRef.current = next.budget
      if (moved) publish()
      return next.rendered < receivedRef.current.length
    }

    const onFrame = (now: number) => {
      if (step(now)) raf = requestAnimationFrame(onFrame)
    }

    const startFrames = () => {
      last = performance.now()
      raf = requestAnimationFrame(onFrame)
    }

    const stop = () => {
      cancelAnimationFrame(raf)
      window.clearInterval(interval)
      raf = 0
      interval = 0
    }

    const syncVisibility = () => {
      stop()
      if (typeof document !== 'undefined' && document.hidden) {
        last = performance.now()
        interval = window.setInterval(() => {
          if (!step(performance.now())) window.clearInterval(interval)
        }, HIDDEN_DRAIN_MS)
        return
      }
      startFrames()
    }

    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', syncVisibility)
    }
  }, [source, immediate])

  return receivedRef.current.slice(0, renderedRef.current).join('')
}
