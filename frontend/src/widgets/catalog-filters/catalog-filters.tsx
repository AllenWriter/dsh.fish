import { Form, useSearchParams } from 'react-router'
import type { FacetsDto } from '@/entities/artifact/model/types'
import { t } from '@/shared/config/messages'
import { cn } from '@/shared/lib/utils'

/**
 * Filter rail.
 *
 * Every control is a link that changes the URL rather than local state, so a
 * filtered view is shareable, back/forward works, and the server renders the
 * same page a crawler sees.
 */
export function CatalogFilters({ facets }: { facets: FacetsDto }) {
  const [params] = useSearchParams()
  const activeKinds = new Set(params.getAll('kind'))
  const activeCategories = new Set(params.getAll('category'))

  return (
    <aside className="space-y-7">
      <section>
        <h2 className="text-sm font-medium text-foreground">{t('browse.kind')}</h2>
        <ul className="mt-3 space-y-1">
          {facets.kinds.map((facet) => {
            const active = activeKinds.has(facet.kind)
            return (
              <li key={facet.kind}>
                <a
                  href={toggleParam(params, 'kind', facet.kind)}
                  aria-pressed={active}
                  title={t(facet.descriptionKey)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                    active
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <span className="flex-1 truncate">{t(facet.labelKey)}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{facet.count}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium text-foreground">{t('browse.category')}</h2>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {facets.categories.map((category) => {
            const active = activeCategories.has(category.id)
            return (
              <li key={category.id}>
                <a
                  href={toggleParam(params, 'category', category.id)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex rounded-full border px-2.5 py-1 text-xs transition-colors',
                    active
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
                  )}
                >
                  {t(category.labelKey)}
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <Form method="get" action="/browse">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="verified"
            value="true"
            defaultChecked={params.get('verified') === 'true'}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="size-4 rounded border-border accent-[var(--color-primary)]"
          />
          {t('browse.verifiedOnly')}
        </label>
        {/* Preserve the rest of the query when this control submits. */}
        {[...params.entries()]
          .filter(([key]) => key !== 'verified')
          .map(([key, value]) => (
            <input key={`${key}-${value}`} type="hidden" name={key} value={value} />
          ))}
      </Form>
    </aside>
  )
}

/** Add or remove one value of a repeatable parameter, resetting pagination. */
function toggleParam(params: URLSearchParams, key: string, value: string): string {
  const next = new URLSearchParams(params)
  const existing = next.getAll(key)
  next.delete(key)
  for (const entry of existing) {
    if (entry !== value) next.append(key, entry)
  }
  if (!existing.includes(value)) next.append(key, value)
  next.delete('offset')
  const query = next.toString()
  return query === '' ? '/browse' : `/browse?${query}`
}
