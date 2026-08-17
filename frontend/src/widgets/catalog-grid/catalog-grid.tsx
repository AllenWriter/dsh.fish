import { ArtifactCard } from '@/entities/artifact/ui/artifact-card'
import type { Artifact } from '@/entities/artifact/model/types'
import { useT } from '@/shared/config/i18n'
import { LocaleLink } from '@/shared/ui/locale-link'
import { BrowseIcon, SearchIcon, SubmitIcon } from '@/shared/ui/icon'

/**
 * The result grid. Empty state is a real state, not a blank area: it says what
 * happened and offers the two ways forward.
 */
export function CatalogGrid({ artifacts }: { artifacts: readonly Artifact[] }) {
  const t = useT()

  if (artifacts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
        {/* The mark of the thing that came back empty. It repeats the search
            control's glyph rather than introducing a mascot, so the panel reads
            as the outcome of that control. */}
        <span
          aria-hidden
          className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-muted text-muted-foreground"
        >
          <SearchIcon className="size-5" />
        </span>
        <p className="mt-4 font-medium">{t('browse.empty')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('browse.emptyHint')}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <LocaleLink
            to="/browse"
            className="press inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-border-strong"
          >
            <BrowseIcon className="size-4" weight="bold" aria-hidden />
            {t('browse.clearFilters')}
          </LocaleLink>
          <LocaleLink
            to="/submit"
            className="press inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <SubmitIcon className="size-4" weight="bold" aria-hidden />
            {t('nav.submit')}
          </LocaleLink>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {artifacts.map((artifact, index) => (
        <ArtifactCard key={artifact.id} artifact={artifact} index={index} />
      ))}
    </div>
  )
}
