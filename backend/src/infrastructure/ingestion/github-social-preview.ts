import { generatedOgImageUrl, tryOgImageUrl } from '../../domain/artifact/og-image-url.js'

const GRAPHQL = 'https://api.github.com/graphql'
const QUERY = `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){usesCustomOpenGraphImage openGraphImageUrl}}`

interface GraphQlBody {
  data?: {
    repository?: {
      usesCustomOpenGraphImage?: boolean
      openGraphImageUrl?: string
    } | null
  }
}

/**
 * Reads the image GitHub would put on a repository card.
 *
 * An uploaded Social preview wins. Otherwise the generated Open Graph card is
 * used — every public repository has one, so a catalog row sourced from GitHub
 * always has a URL to show. The owner's avatar is never a preview.
 */
export class GitHubSocialPreview {
  constructor(private readonly token?: string) {}

  /**
   * `undefined` only if even the generated URL cannot be formed. Callers that
   * already know `owner/repo` always get a string.
   */
  async read(owner: string, repo: string, cacheKey?: string): Promise<string> {
    const generated = generatedOgImageUrl(owner, repo, cacheKey)
    const custom = await this.readCustom(owner, repo)
    return custom ?? generated
  }

  /**
   * The author-uploaded Social preview, or `null` when GitHub says there is
   * none. `undefined` means the lookup failed, so the caller should keep the
   * generated card rather than treat the miss as authoritative.
   */
  async readCustom(owner: string, repo: string): Promise<string | null | undefined> {
    const headers: Record<string, string> = {
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'dsh.fish-indexer',
    }
    if (this.token !== undefined) {
      headers['authorization'] = `Bearer ${this.token}`
    }

    let response: Response
    try {
      response = await fetch(GRAPHQL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: QUERY, variables: { owner, name: repo } }),
      })
    } catch {
      return undefined
    }
    if (!response.ok) return undefined

    let body: GraphQlBody
    try {
      body = (await response.json()) as GraphQlBody
    } catch {
      return undefined
    }

    const repository = body.data?.repository
    if (repository == null) return null
    if (repository.usesCustomOpenGraphImage !== true) return null
    if (typeof repository.openGraphImageUrl !== 'string') return null
    return tryOgImageUrl(repository.openGraphImageUrl) ?? null
  }
}
