import { isRetiredArtifactKind } from '@dsh-fish/backend/domain/artifact/artifact-kind.js'
import { localizedPath, splitLocalePath } from '@/shared/config/i18n'

/**
 * Where a retired `/kind/<id>` URL should 301.
 *
 * `mcp-server` and `hook-bridge` used to be catalog kinds. They stay as
 * bookmarks (footer, llms.txt, inbound links) so they fold onto `/blog`
 * instead of 404ing. Live kinds return undefined and route as themselves.
 */
export function retiredKindRedirect(pathname: string, search = ''): string | undefined {
  const { locale, path } = splitLocalePath(pathname)
  const match = /^\/kind\/([\w-]+)(\.md)?$/.exec(path)
  if (match === null) return undefined
  if (!isRetiredArtifactKind(match[1]!)) return undefined
  return `${localizedPath(locale, `/blog${match[2] ?? ''}`)}${search}`
}

const RETIRED_PUBLISH_DOCS = new Set(['mcp-server', 'hook-bridge'])

/**
 * Retired publish guides fold onto the plugins overview, which still explains
 * the kinds the catalog lists.
 */
export function retiredPublishDocsRedirect(pathname: string, search = ''): string | undefined {
  const { locale, path } = splitLocalePath(pathname)
  const match = /^\/docs\/publish\/([\w-]+)(\.md)?$/.exec(path)
  if (match === null) return undefined
  if (!RETIRED_PUBLISH_DOCS.has(match[1]!)) return undefined
  return `${localizedPath(locale, `/docs/plugins${match[2] ?? ''}`)}${search}`
}
