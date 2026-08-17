import { KIND_CHIP, kindLabelKey, type ArtifactKind } from '../model/types'
import { KindIcon } from './kind-icon'
import { useT } from '@/shared/config/i18n'
import { cn } from '@/shared/lib/utils'

/**
 * The kind marker.
 *
 * Kind is the most load-bearing fact about a row — it decides how the thing
 * installs — so the chip carries it twice: as a glyph a reader recognises across
 * a grid without reading, and as the word that says which kind it is. Never as a
 * colour. See KIND_CHIP and KIND_ICON.
 */
export function KindChip({ kind, className }: { kind: ArtifactKind; className?: string }) {
  const t = useT()
  return (
    <span className={cn(KIND_CHIP, className)}>
      <KindIcon kind={kind} className="size-3.5" />
      {t(kindLabelKey(kind))}
    </span>
  )
}
