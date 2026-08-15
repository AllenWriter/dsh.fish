import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { ARTIFACT_KIND_META, ARTIFACT_KINDS } from '../../domain/artifact/artifact-kind.js'
import type { ArtifactKind } from '../../domain/artifact/artifact-kind.js'
import { CATEGORIES } from '../../domain/artifact/category.js'

export interface FacetsDto {
  readonly kinds: readonly {
    kind: ArtifactKind
    labelKey: string
    descriptionKey: string
    packageManaged: boolean
    count: number
  }[]
  readonly categories: readonly { id: string; labelKey: string }[]
}

/**
 * The filter rails. Every kind is listed even at count zero, so the site can
 * show the taxonomy honestly rather than hiding a type nobody has published yet.
 */
export class ListCatalogFacets {
  constructor(private readonly artifacts: ArtifactRepository) {}

  async execute(): Promise<FacetsDto> {
    const counts = await this.artifacts.countByKind()
    const byKind = new Map(counts.map((entry) => [entry.kind, entry.count]))
    return {
      kinds: ARTIFACT_KINDS.map((kind) => ({
        kind,
        labelKey: ARTIFACT_KIND_META[kind].labelKey,
        descriptionKey: ARTIFACT_KIND_META[kind].descriptionKey,
        packageManaged: ARTIFACT_KIND_META[kind].packageManaged,
        count: byKind.get(kind) ?? 0,
      })),
      categories: CATEGORIES.map((entry) => ({ id: entry.id, labelKey: entry.labelKey })),
    }
  }
}
