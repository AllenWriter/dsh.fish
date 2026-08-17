import { categoryIcon } from '../model/icons'
import { ICON_WEIGHT, type IconWeight } from '@/shared/ui/icon'

/**
 * The mark for one category, when the taxonomy has one.
 *
 * Decorative: every pill and link that carries this glyph also carries the
 * translated category name.
 */
export function CategoryIcon({
  id,
  className,
  weight = ICON_WEIGHT.BODY,
}: {
  id: string
  className?: string
  weight?: IconWeight
}) {
  const Icon = categoryIcon(id)
  if (!Icon) return null
  return <Icon className={className} weight={weight} />
}
