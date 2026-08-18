import { MAINTENANCE_CHIP, type MaintenanceStatus } from '../model/types'
import { useT } from '@/shared/config/i18n'
import { cn } from '@/shared/lib/utils'

/**
 * How actively the source is maintained, as a chip.
 *
 * Always rendered, in words: a missing chip would read as "unknown", and the
 * status is one of the facts a reader weighs before installing. The title says
 * what the status means; the word alone is jargon otherwise.
 */
export function MaintenanceChip({
  status,
  className,
}: {
  status: MaintenanceStatus
  className?: string
}) {
  const t = useT()
  return (
    <span
      title={t(`artifact.maintenanceTitle.${status}`)}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        MAINTENANCE_CHIP[status],
        className,
      )}
    >
      {t(`artifact.maintenance.${status}`)}
    </span>
  )
}
