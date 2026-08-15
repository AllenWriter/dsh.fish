import { KIND_STYLE, kindLabelKey, type ArtifactKind } from '../model/types'
import { t } from '@/shared/config/messages'
import { cn } from '@/shared/lib/utils'

/**
 * The kind marker.
 *
 * Kind is the single most load-bearing fact about a row — it decides how the
 * thing installs — so it gets a colour and a dot rather than being one more
 * grey pill among the metadata.
 */
export function KindChip({
  kind,
  className,
  showDot = true,
}: {
  kind: ArtifactKind
  className?: string
  showDot?: boolean
}) {
  const style = KIND_STYLE[kind]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        style.chip,
        className,
      )}
    >
      {showDot ? (
        <span aria-hidden className={cn('size-1.5 rounded-full', style.dot)} />
      ) : null}
      {t(kindLabelKey(kind))}
    </span>
  )
}
