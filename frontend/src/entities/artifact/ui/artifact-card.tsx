import { motion, useReducedMotion } from 'motion/react'
import { BadgeCheck, Download, Star } from 'lucide-react'
import type { Artifact } from '../model/types'
import { KindChip } from './kind-chip'
import { useT } from '@/shared/config/i18n'
import { LocaleLink } from '@/shared/ui/locale-link'
import { compactNumber } from '@/shared/lib/format'
import { EASE_OUT } from '@/shared/lib/ease'
import { cn } from '@/shared/lib/utils'

/**
 * One catalog row.
 *
 * The card leads with kind, then name, then the one-line summary — the order a
 * reader scanning a grid actually needs. Stats sit last and only appear when
 * they are non-zero: an npm bundle has downloads and no stars, a GitHub skill
 * has stars and no downloads, and rendering a dead `0 ★` on every card would
 * add noise to every row to serve neither.
 */
export function ArtifactCard({ artifact, index = 0 }: { artifact: Artifact; index?: number }) {
  const t = useT()
  const reduce = useReducedMotion()

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        ease: EASE_OUT,
        // Staggered by position, capped so a full page never feels slow.
        delay: reduce ? 0 : Math.min(index, 8) * 0.03,
      }}
      className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <KindChip kind={artifact.kind} />
        {artifact.verified ? (
          <span
            title={t('artifact.verifiedTitle')}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            <BadgeCheck className="size-3.5" aria-hidden />
            {t('artifact.verified')}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug tracking-tight">
        <LocaleLink
          to={`/a/${artifact.id}`}
          className="after:absolute after:inset-0 after:content-['']"
        >
          {artifact.displayName}
        </LocaleLink>
      </h3>

      <p className="mt-1.5 line-clamp-2 flex-1 text-pretty text-sm leading-relaxed text-muted-foreground">
        {artifact.summary}
      </p>

      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        {artifact.author ? (
          <span className="truncate font-medium">{artifact.author.name}</span>
        ) : null}
        <span className="ml-auto flex shrink-0 items-center gap-3">
          {artifact.stats.stars > 0 ? (
            <Stat icon={<Star className="size-3.5" aria-hidden />} value={artifact.stats.stars} />
          ) : null}
          {artifact.stats.downloads > 0 ? (
            <Stat
              icon={<Download className="size-3.5" aria-hidden />}
              value={artifact.stats.downloads}
            />
          ) : null}
        </span>
      </div>

      {artifact.deprecated ? (
        <span className="mt-3 inline-flex w-fit rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
          {t('artifact.deprecated')}
        </span>
      ) : null}
    </motion.article>
  )
}

function Stat({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span className={cn('inline-flex items-center gap-1 tabular-nums')}>
      {icon}
      {compactNumber(value)}
    </span>
  )
}
