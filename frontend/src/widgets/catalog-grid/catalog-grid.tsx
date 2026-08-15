import { Link } from 'react-router'
import { ArtifactCard } from '@/entities/artifact/ui/artifact-card'
import type { Artifact } from '@/entities/artifact/model/types'
import { t } from '@/shared/config/messages'

/**
 * The result grid. Empty state is a real state, not a blank area: it says what
 * happened and offers the two ways forward.
 */
export function CatalogGrid({ artifacts }: { artifacts: readonly Artifact[] }) {
  if (artifacts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <p className="font-medium">{t('browse.empty')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('browse.emptyHint')}</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            to="/browse"
            className="press rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-border-strong"
          >
            {t('browse.clearFilters')}
          </Link>
          <Link
            to="/submit"
            className="press rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {t('nav.submit')}
          </Link>
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
