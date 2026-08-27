import { AWESOME_LISTS } from './awesome-list-indexer.js'
import { overlayFromCandidates } from './list-candidates.js'
import type { CategoryOverlay } from '../../application/port/category-overlay.js'

/**
 * The category overlay a reclassify pass reads: every curated list, fetched
 * once per run, folded so awesome-dsh-plugin.com wins on a repository both
 * lists name.
 *
 * This is cheap compared to probing GitHub. Two JSON documents, no manifest
 * reads — the overlay is a hint, not proof, and a repository that is not a
 * loadable plugin is never in the catalog for it to label.
 */
export class HttpCuratedCategoryOverlay implements CategoryOverlay {
  constructor(private readonly lists = AWESOME_LISTS) {}

  async load(): Promise<ReadonlyMap<string, string>> {
    const layers = []
    for (const list of this.lists) {
      try {
        const response = await fetch(list.url, {
          headers: { accept: 'application/json', 'user-agent': 'dsh.fish-indexer' },
        })
        if (!response.ok) continue
        layers.push(list.extract(await response.json()))
      } catch {
        // One unreachable list must not abort the pass: inference still
        // refiles rows the overlay cannot name.
      }
    }
    return overlayFromCandidates(layers)
  }
}
