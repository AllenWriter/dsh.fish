import NumberFlow from '@number-flow/react'
import { compactNumberParts } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

/**
 * A compact count that can tick when the value changes.
 *
 * NumberFlow is the shared primitive; catalog cards, the home total and the
 * detail metrics all read through here so compact formatting and motion stay
 * one decision. `locales` is pinned to `en` and fraction digits are explicit
 * so Cloudflare's ICU and the browser cannot disagree at hydration.
 *
 * First paint is static. The component only animates if this instance's
 * `value` later changes — browsing from one card to another remounts, so
 * scanning the grid does not spin digits.
 */
export function AnimatedNumber({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const parts = compactNumberParts(value)
  const display = Number(parts.value.toFixed(parts.fractionDigits))

  return (
    <NumberFlow
      value={display}
      locales="en"
      isolate
      format={{
        useGrouping: false,
        minimumFractionDigits: parts.fractionDigits,
        maximumFractionDigits: parts.fractionDigits,
      }}
      {...(parts.suffix === '' ? {} : { suffix: parts.suffix })}
      className={cn('tabular-nums', className)}
    />
  )
}
