import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * One icon slot whose glyph changes with state.
 *
 * Every control in this product that trades one mark for another — copy for
 * confirmed, moon for sun, menu for close — moves through here, so they all move
 * the same way. Opacity, scale and blur together on a bounceless spring: toggling
 * `visibility` would blink between two unrelated glyphs, while blurring across
 * the swap reads as one mark changing rather than two marks trading places.
 *
 * Reduced motion keeps the crossfade and drops the travel and the blur — gentler,
 * not absent, because the fade is what makes the change legible.
 *
 * `initial={false}`: the idle glyph is what the server rendered, so it must not
 * animate in on first paint.
 */
export function IconSwap({
  swapKey,
  children,
  className,
}: {
  /** Changing this value is what triggers the swap. */
  swapKey: string
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.span
        key={swapKey}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
        transition={reduce ? { duration: 0.12 } : { type: 'spring', duration: 0.3, bounce: 0 }}
        className={className ?? 'grid place-items-center'}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  )
}
