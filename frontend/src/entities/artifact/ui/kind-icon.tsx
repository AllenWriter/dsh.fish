import { kindIcon } from '../model/icons'
import type { ArtifactKind } from '../model/types'
import { ICON_WEIGHT, type IconWeight } from '@/shared/ui/icon'

/**
 * The mark for one artifact kind.
 *
 * Decorative in every position it appears in: a chip, a nav row, a footer link
 * and a tab all name the kind in words beside it, so the glyph is hidden from
 * assistive technology rather than read out a second time.
 */
export function KindIcon({
  kind,
  className,
  weight = ICON_WEIGHT.LABEL,
}: {
  kind: ArtifactKind
  className?: string
  weight?: IconWeight
}) {
  const Icon = kindIcon(kind)
  return <Icon className={className} weight={weight} />
}
