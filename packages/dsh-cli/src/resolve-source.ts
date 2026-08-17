import { HubError, type ArtifactSummary, type HubClient } from 'dsh-hub/install'

const HUB_ARTIFACT_PATH =
  /(?:^|\/)(?:[a-z]{2}(?:-[A-Za-z]{2,4})?\/)?a\/([a-z0-9][a-z0-9-]*)\/?$/i
const SLUG = /^[a-z0-9][a-z0-9-]*$/
const GITHUB_PAIR = /^(?:github:)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/

export function artifactIdFromHubUrl(raw: string): string | undefined {
  let pathname: string
  try {
    pathname = new URL(raw).pathname
  } catch {
    return undefined
  }
  const match = pathname.match(HUB_ARTIFACT_PATH)
  return match?.[1]
}

export function githubShorthand(raw: string): { owner: string; repo: string } | undefined {
  const trimmed = raw.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      if (!/^(www\.)?github\.com$/i.test(url.hostname)) return undefined
      const [owner, repo] = url.pathname.split('/').filter((part) => part !== '')
      if (owner === undefined || repo === undefined) return undefined
      return { owner, repo: repo.replace(/\.git$/i, '') }
    } catch {
      return undefined
    }
  }
  const match = trimmed.match(GITHUB_PAIR)
  if (match?.[1] === undefined || match[2] === undefined) return undefined
  return { owner: match[1], repo: match[2] }
}

/**
 * Turn whatever a human typed after `add` into one catalog row.
 *
 * Accepts a hub id, a dsh.fish URL, `owner/repo`, or a search phrase. Several
 * matches is an error listing ids — guessing would install the wrong artifact.
 */
export async function resolveArtifact(
  client: HubClient,
  source: string,
): Promise<ArtifactSummary> {
  const trimmed = source.trim()
  if (trimmed === '') {
    throw new HubError('Pass an artifact id, a dsh.fish URL, or owner/repo.', 'USAGE')
  }

  const fromUrl = artifactIdFromHubUrl(trimmed)
  const asId = fromUrl ?? (SLUG.test(trimmed) ? trimmed : undefined)
  if (asId !== undefined) {
    try {
      return await client.detail(asId)
    } catch (error) {
      if (fromUrl !== undefined) throw error
      if (!(error instanceof HubError) || error.code !== 'NOT_FOUND') throw error
    }
  }

  const gh = githubShorthand(trimmed)
  const query = gh === undefined ? trimmed : `${gh.owner}/${gh.repo}`
  const result = await client.search({ query, limit: 10 })
  if (gh !== undefined) {
    const needle = `${gh.owner}/${gh.repo}`.toLowerCase()
    const match = result.items.find((item) => item.sourceUrl.toLowerCase().includes(needle))
    if (match) return match
  }
  if (result.items.length === 1) return result.items[0]!
  if (result.items.length === 0) {
    throw new HubError(`No artifact matching "${trimmed}" on the hub.`, 'NOT_FOUND')
  }
  const listing = result.items
    .map((item) => `  ${item.id}  [${item.kind}]  ${item.displayName}`)
    .join('\n')
  throw new HubError(
    `Several artifacts match "${trimmed}". Pass an id:\n${listing}`,
    'AMBIGUOUS',
  )
}
