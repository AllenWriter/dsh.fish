import { KIND_CHIP, kindLabelKey, type ArtifactKind } from '../model/types'
import { t } from '@/shared/config/messages'
import { cn } from '@/shared/lib/utils'

/**
 * The kind marker.
 *
 * Kind is the most load-bearing fact about a row — it decides how the thing
 * installs — but it is carried by the word, not by a colour. See KIND_CHIP.
 */
export function KindChip({ kind, className }: { kind: ArtifactKind; className?: string }) {
  return <span className={cn(KIND_CHIP, className)}>{t(kindLabelKey(kind))}</span>
}
