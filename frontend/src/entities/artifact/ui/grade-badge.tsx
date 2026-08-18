import { GRADE_BADGE, type QualityGrade } from '../model/types'
import { useT } from '@/shared/config/i18n'
import { cn } from '@/shared/lib/utils'

/**
 * The letter grade, as a small square badge.
 *
 * The letter is the content and the hue only reinforces it — see GRADE_BADGE
 * for why a grade may spend colour where a kind may not. The title carries the
 * full phrase for anyone hovering or long-pressing.
 */
export function GradeBadge({ grade, className }: { grade: QualityGrade; className?: string }) {
  const t = useT()
  return (
    <span
      title={t('artifact.gradeTitle', { grade })}
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold',
        GRADE_BADGE[grade],
        className,
      )}
    >
      {grade}
    </span>
  )
}
