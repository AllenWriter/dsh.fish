// beui.dev/lib/hooks/use-dismiss — vendored from the beui registry, cut down
// to the pass-through behavior: the registry also ships a `consume` mode for
// overlays whose dismissal must swallow the tap's activation too, with the
// cross-scope bookkeeping that needs. This product's one caller is a
// corner stack that covers little of the page, so the tap that closes it is
// allowed to also do whatever it was aimed at — the platform norm.

import { type RefObject, useEffect } from 'react'

export interface DismissOptions {
  /** Dismiss on Escape as well. Default true. */
  escape?: boolean
  /** Return true for an outside target that should *not* dismiss. Must be stable. */
  ignore?: (target: Element) => boolean
}

/**
 * Close an open overlay on Escape or a pointerdown outside `ref`. Pass `null`
 * for `ref` when what counts as inside isn't one element, and say so with
 * `ignore` instead.
 *
 * The pointerdown listener is capture-phase: a bubble-phase one is blinded by
 * any handler in between that stops propagation, and an overlay cannot know
 * what it is layered over. `onDismiss` and `ignore` must be stable (wrap in
 * useCallback) so the listeners aren't re-bound every render while open.
 */
export function useDismiss(
  open: boolean,
  onDismiss: () => void,
  ref: RefObject<HTMLElement | null> | null,
  { escape: dismissOnEscape = true, ignore }: DismissOptions = {},
) {
  useEffect(() => {
    if (!open) return
    const inside = (target: Element) =>
      Boolean(ref?.current?.contains(target)) || Boolean(ignore?.(target))
    const onKey = (event: KeyboardEvent) => {
      if (dismissOnEscape && event.key === 'Escape') onDismiss()
    }
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target || inside(target)) return
      onDismiss()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer, true)
    }
  }, [open, onDismiss, ref, dismissOnEscape, ignore])
}
