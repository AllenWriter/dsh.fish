import type { Route } from './+types/og-image'
import { hubContext } from '@/shared/api/hub-context'
import { renderOgPng } from '@/shared/lib/og'
import { artifactOgCard, OG_CARD_SIZE } from './og-card'

/**
 * `/a/:artifactId/og.png` — the card every artifact page's `og:image` points at.
 *
 * Rendered on request rather than committed like the site card: the content
 * (name, grade, counts) changes as the catalog re-crawls, and there are too
 * many artifacts to pre-render. It is only ever fetched by link-preview
 * crawlers, so the ~1 MB of Wasm this pulls into the Worker never touches the
 * HTML path, and the hour-long cache lifetime matches the sitemap XML.
 *
 * A resource route, not a page: the loader is the whole response.
 */
export async function loader({ context, params }: Route.LoaderArgs) {
  const { container } = context.get(hubContext)
  const artifact = await container.useCases.getArtifactDetail
    .execute(params.artifactId)
    .catch(() => undefined)

  if (!artifact) {
    return new Response(null, { status: 404 })
  }

  const png = await renderOgPng(artifactOgCard(artifact), OG_CARD_SIZE)
  return new Response(png as BodyInit, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=3600',
    },
  })
}
