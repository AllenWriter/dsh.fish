import { MAINTENANCE_CHIP, type MaintenanceStatus } from '../model/types'
import { useT } from '@/shared/config/i18n'
import { cn } from '@/shared/lib/utils'

/**
 * How actively the source is maintained, as a chip.
 *
 * Only deviations render. "Active" is the default state of the catalog — a chip
 * on every card carries no information and reads as noise, so the component
 * renders nothing for it and the absence simply means "maintained". Slowing,
 * stale and abandoned are the facts a reader weighs before installing, so they
 * always render, in words; the title says what the status means.
 */
export function MaintenanceChip({
  status,
  className,
}: {
  status: MaintenanceStatus
  className?: string
}) {
  const t = useT()
  if (status === 'active') return null
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
