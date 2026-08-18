import type { Artifact, PageDto } from '@/entities/artifact/model/types'

const SEARCH_LIMIT = 8

/**
 * Live catalog search for the header palette.
 *
 * Same endpoint the browse page's loader uses, so a hit in the palette and a
 * hit on `/browse?q=` cannot disagree. The Worker already serves `/api/*`
 * from this origin, so the browser needs no extra host.
 */
export async function searchCatalog(
  text: string,
  signal: AbortSignal,
): Promise<readonly Artifact[]> {
  const params = new URLSearchParams({ q: text, limit: String(SEARCH_LIMIT) })
  const response = await fetch(`/api/v1/artifacts?${params}`, { signal })
  if (!response.ok) {
    throw new Error(`Catalog search failed (${response.status})`)
  }
  const body = (await response.json()) as PageDto<Artifact>
  return body.items
}
