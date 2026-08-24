import { IconContext, IconBase, type Icon, type IconProps, type IconWeight } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

export { IconBase }
export type { Icon, IconProps, IconWeight }

/**
 * Icon weights, named by the job rather than by the stroke.
 *
 * Phosphor draws every glyph on a 256-unit grid, so a weight is a fixed
 * fraction of the rendered size: `regular` is 16/256 (1.5px at 24px) and `bold`
 * is 24/256 (2.25px). Those two numbers are exactly the optical weights text at
 * 400 and at 500–600 wants beside it, which is why this product needs no third
 * outline weight.
 *
 * `ACTIVE` is the fill variant. It is a state, not an emphasis: an icon switches
 * to it when the thing it marks is selected, applied or affirmed, and colour
 * changes with it so the state is never carried by shape alone.
 */
export const ICON_WEIGHT = {
  /** Beside body copy at 400. */
  BODY: 'regular',
  /** Beside a label at 500–600, and for icon-only controls, which stand alone. */
  LABEL: 'bold',
  /** Selected, applied, or affirmed. */
  ACTIVE: 'fill',
} as const satisfies Record<string, IconWeight>

/**
 * Document-wide icon defaults.
 *
 * `1em` ties an icon to the cap height of whatever text it sits in, so an icon
 * dropped into a heading or a caption is already the right size; a `size-*`
 * class still wins where a control needs an exact box. `currentColor` is
 * Phosphor's own default and is restated here because it is the rule the whole
 * system depends on: one glyph, recoloured by CSS for hover, active and
 * disabled, never a second asset per state.
 *
 * `aria-hidden` is a default and not a per-call-site duty. Every mark in this
 * product accompanies a visible label, or an `aria-label` on the control it sits
 * inside, so announcing the glyph as well would read the same thing twice; making
 * that the default is what stops the one call site that forgets from being the
 * one that regresses. A caller that ever does need an announced icon overrides
 * both `aria-hidden` and `alt`, which Phosphor renders as a `<title>`.
 */
export function IconDefaults({ children }: { children: ReactNode }) {
  return (
    <IconContext.Provider
      value={{
        size: '1em',
        weight: ICON_WEIGHT.BODY,
        color: 'currentColor',
        'aria-hidden': true,
      }}
    >
      {children}
    </IconContext.Provider>
  )
}
