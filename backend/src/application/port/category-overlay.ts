/**
 * owner/repo (lowercased) → canonical category, from curated catalogs.
 *
 * A reclassify pass fetches this once. Missing keys mean "the lists did not
 * name this repository"; inference still runs.
 */
export interface CategoryOverlay {
  load(): Promise<ReadonlyMap<string, string>>
}
