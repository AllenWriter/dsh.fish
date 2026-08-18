import type { Artifact } from '@/entities/artifact/model/types'
import { useT } from '@/shared/config/i18n'
import { badgePath } from '@/shared/lib/badge'
import { CopyButton } from '@/shared/ui/copy-button'

/**
 * The Markdown an author pastes into their README so the badge links back here.
 *
 * The preview renders the badge route itself — what you see is byte-for-byte
 * what a README reader gets. The snippet links the image to the artifact page,
 * which is the whole point of the loop: every embedded badge is one more
 * doorway into the catalog.
 */
export function ReadmeBadge({ artifact, origin }: { artifact: Artifact; origin: string }) {
  const t = useT()
  const alt = t('artifact.badge.alt', { name: artifact.displayName })
  const markdown = `[![${alt}](${origin}${badgePath(artifact.id)})](${origin}/a/${artifact.id})`

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold tracking-tight">{t('artifact.badge.title')}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t('artifact.badge.description')}
      </p>
      <div className="mt-3">
        <img src={badgePath(artifact.id)} alt={alt} className="h-5 w-auto" />
      </div>
      {/* The same block a shell command gets in the install panel: monospace,
          one copy affordance, nothing else to learn. */}
      <div className="group relative mt-3 rounded-md border border-border bg-muted/60 px-3 py-2.5 pr-11 font-mono text-[13px] leading-relaxed">
        <pre className="overflow-x-auto whitespace-pre [scrollbar-width:thin]">{markdown}</pre>
        <CopyButton
          text={markdown}
          className="absolute right-2 top-2 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        />
      </div>
    </section>
  )
}
