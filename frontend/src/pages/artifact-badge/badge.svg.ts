import type { Route } from './+types/badge.svg'
import { hubContext } from '@/shared/api/hub-context'
import { artifactBadgeSvg, BADGE_METRICS, type BadgeMetric } from '@/shared/lib/badge'

/**
 * `/a/:artifactId/badge.svg` — the shields-style badge authors embed in their
 * READMEs (the artifact page hands them the Markdown snippet).
 *
 * Lives beside the artifact rather than under `/api/`: the API namespace is
 * the versioned JSON contract for clients, and robots.txt keeps crawlers out
 * of it. A badge is a presentational asset like the OG card, fetched by
 * README renderers rather than API consumers, so it follows the OG route's
 * shape. `?metric=stars` swaps the grade for the star count.
 */
export async function loader({ context, params, request }: Route.LoaderArgs) {
  const requested = new URL(request.url).searchParams.get('metric') ?? 'grade'
  if (!BADGE_METRICS.includes(requested as BadgeMetric)) {
    return new Response(null, { status: 400 })
  }

  const { container } = context.get(hubContext)
  const artifact = await container.useCases.getArtifactDetail
    .execute(params.artifactId)
    .catch(() => undefined)

  if (!artifact) {
    return new Response(null, { status: 404 })
  }

  return new Response(artifactBadgeSvg(artifact, requested as BadgeMetric), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
