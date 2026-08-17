import type {
  ArtifactQuery,
  ArtifactRepository,
  ArtifactSort,
} from '../../domain/artifact/artifact-repository.js'
import { artifactKind } from '../../domain/artifact/artifact-kind.js'
import { isCategory } from '../../domain/artifact/category.js'
import { DomainError } from '../../domain/shared/error.js'
import { pageRequest } from '../../domain/shared/pagination.js'
import { slug } from '../../domain/shared/slug.js'
import type { ArtifactSummaryDto, PageDto } from '../dto/artifact-dto.js'
import { toPageDto, toSummaryDto } from '../dto/artifact-dto.js'

export interface SearchArtifactsInput {
  readonly text?: string
  readonly kinds?: readonly string[]
  readonly categories?: readonly string[]
  readonly verifiedOnly?: boolean
  readonly includeDeprecated?: boolean
  readonly sort?: string
  readonly limit?: number
  readonly offset?: number
}

const SORTS: readonly ArtifactSort[] = ['relevance', 'popular', 'recent', 'name']

/**
 * The one read path behind the site's browse page, the home page rails, the
 * `dsh-hub` plugin's `hub_search` tool, and `@dsh-fish/cli find`. Sharing it is
 * what keeps the agent's view of the catalog identical to the human's.
 */
export class SearchArtifacts {
  constructor(private readonly artifacts: ArtifactRepository) {}

  async execute(input: SearchArtifactsInput): Promise<PageDto<ArtifactSummaryDto>> {
    const query: ArtifactQuery = {
      ...(input.text === undefined || input.text.trim() === ''
        ? {}
        : { text: input.text.trim().slice(0, 200) }),
      ...(input.kinds === undefined || input.kinds.length === 0
        ? {}
        : { kinds: input.kinds.map((value) => artifactKind(value)) }),
      ...(input.categories === undefined || input.categories.length === 0
        ? {}
        : { categories: input.categories.map(assertCategory) }),
      ...(input.verifiedOnly === undefined ? {} : { verifiedOnly: input.verifiedOnly }),
      ...(input.includeDeprecated === undefined
        ? {}
        : { includeDeprecated: input.includeDeprecated }),
      sort: resolveSort(input.sort, input.text),
      page: pageRequest(input.limit, input.offset),
    }

    const result = await this.artifacts.search(query)
    return toPageDto(result, toSummaryDto)
  }
}

function assertCategory(raw: string) {
  if (!isCategory(raw)) {
    throw DomainError.invalid('Unknown category.', { raw })
  }
  return slug(raw)
}

/**
 * Relevance only means something with a query behind it; an empty search sorted
 * by relevance would otherwise return an arbitrary page.
 */
function resolveSort(raw: string | undefined, text: string | undefined): ArtifactSort {
  const hasText = text !== undefined && text.trim() !== ''
  if (raw === undefined) return hasText ? 'relevance' : 'popular'
  const match = SORTS.find((sort) => sort === raw)
  if (!match) {
    throw DomainError.invalid('Unknown sort.', { raw, supported: SORTS })
  }
  if (match === 'relevance' && !hasText) return 'popular'
  return match
}
