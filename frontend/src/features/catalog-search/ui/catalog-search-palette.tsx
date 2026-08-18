import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { CommandPalette, type CommandItem } from '@/shared/ui/motion/command-palette'
import { useT } from '@/shared/config/i18n'
import { useLocalePath } from '@/shared/ui/locale-link'
import {
  artifactPath,
  browseSearchPath,
  catalogSearchItems,
} from '../lib/catalog-search-items'
import { useCatalogSearch } from '../lib/use-catalog-search'

/**
 * The header's search: a command palette that actually queries the catalog.
 *
 * With no query it lists the destinations the bar already has. With a query it
 * talks to `/api/v1/artifacts` and offers each hit, plus one row that takes the
 * same query to `/browse` — Enter lands on that row, which is the search the
 * control's label promised.
 */
export function CatalogSearchPalette({
  commands,
  open,
  onOpenChange,
}: {
  commands: readonly CommandItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const navigate = useNavigate()
  const localePath = useLocalePath()
  const [query, setQuery] = useState('')
  const { hits, error } = useCatalogSearch(open ? query : '')
  const text = query.trim()

  const items = useMemo(
    () =>
      catalogSearchItems(
        text,
        commands,
        hits,
        error,
        {
          searchLabel: t('nav.search'),
          searchAllLabel: t('nav.searchAll', { query: text }),
          errorLabel: t('common.error'),
        },
        (q) => navigate(localePath(browseSearchPath(q))),
        (id) => navigate(localePath(artifactPath(id))),
      ),
    [commands, error, hits, localePath, navigate, t, text],
  )

  return (
    <CommandPalette
      items={items}
      open={open}
      onOpenChange={onOpenChange}
      onQueryChange={setQuery}
      placeholder={t('nav.search')}
      emptyMessage={error ? t('common.error') : t('browse.empty')}
    />
  )
}
