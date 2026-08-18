import type { Artifact } from '@/entities/artifact/model/types'
import { kindIcon } from '@/entities/artifact/model/icons'
import { SearchIcon } from '@/shared/ui/icon'
import type { CommandItem } from '@/shared/ui/motion/command-palette'

export interface CatalogSearchCopy {
  readonly searchLabel: string
  readonly searchAllLabel: string
  readonly errorLabel: string
}

/**
 * Palette rows for one query.
 *
 * An empty query is navigation, not an empty catalog. A non-empty query always
 * keeps a "search the catalog" row so Enter does what the header control
 * promised, even while hits are still in flight. A failed request is a row of
 * its own — the same empty list as "nothing matched" would hide the failure.
 *
 * Keywords include the raw query because the palette still fuzzy-filters its
 * items; without that, a server hit whose name does not subsequence-match the
 * typed string would vanish from the list that fetched it.
 */
export function catalogSearchItems(
  query: string,
  commands: readonly CommandItem[],
  hits: readonly Artifact[],
  error: boolean,
  copy: CatalogSearchCopy,
  onBrowse: (text: string) => void,
  onArtifact: (id: string) => void,
): CommandItem[] {
  const text = query.trim()
  if (text === '') return [...commands]

  const browse: CommandItem = {
    id: 'browse-search',
    label: copy.searchAllLabel,
    group: copy.searchLabel,
    keywords: [text],
    icon: SearchIcon,
    onSelect: () => onBrowse(text),
  }

  if (error) {
    return [
      browse,
      {
        id: 'search-error',
        label: copy.errorLabel,
        group: copy.searchLabel,
        keywords: [text],
        onSelect: () => onBrowse(text),
      },
    ]
  }

  const plugins: CommandItem[] = hits.map((artifact) => ({
    id: `artifact:${artifact.id}`,
    label: artifact.displayName,
    group: copy.searchLabel,
    keywords: [text, artifact.summary, artifact.id, ...artifact.keywords],
    icon: kindIcon(artifact.kind),
    onSelect: () => onArtifact(artifact.id),
  }))

  return [browse, ...plugins]
}

export function browseSearchPath(text: string): string {
  return `/browse?q=${encodeURIComponent(text)}`
}

export function artifactPath(id: string): string {
  return `/a/${id}`
}
