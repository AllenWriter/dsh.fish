import { RisingIcon } from '@/shared/ui/icon'
import { useT } from '@/shared/config/i18n'
import { cn } from '@/shared/lib/utils'

/**
 * Star momentum, rendered only when there is some.
 *
 * Callers check `starVelocity7d > 0` before rendering: a zero is an unmeasured
 * artifact, not an unloved one, and printing "+0 this week" would say the
 * wrong thing about it.
 */
export function VelocityIndicator({
  count,
  window,
  className,
}: {
  count: number
  window: 'week' | 'month'
  className?: string
}) {
  const t = useT()
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-emerald-600 dark:text-emerald-400',
        className,
      )}
    >
      <RisingIcon className="size-3.5" weight="bold" />
      <span className="tabular-nums">
        {t(window === 'week' ? 'artifact.starsThisWeek' : 'artifact.starsThisMonth', { count })}
      </span>
    </span>
  )
}
