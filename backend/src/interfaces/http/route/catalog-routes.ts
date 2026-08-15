import { Hono } from 'hono'
import { z } from 'zod'
import { ARTIFACT_KINDS } from '../../../domain/artifact/artifact-kind.js'
import type { HubBindings } from '../app.js'

const searchQuery = z.object({
  q: z.string().max(200).optional(),
  kind: z.array(z.enum(ARTIFACT_KINDS)).optional(),
  category: z.array(z.string()).optional(),
  sort: z.enum(['relevance', 'popular', 'recent', 'name']).optional(),
  verified: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const installQuery = z.object({
  profile: z.string().max(64).optional(),
  /** Only the plugin's real install sets this; the site previews without it. */
  record: z.coerce.boolean().optional(),
})

/**
 * Read-only catalog endpoints. Anonymous by design: browsing and resolving an
 * install plan never require an account, so a first-time user can copy a
 * command without signing up.
 */
export function catalogRoutes() {
  const routes = new Hono<HubBindings>()

  routes.get('/artifacts', async (context) => {
    const parsed = searchQuery.parse({
      ...context.req.query(),
      kind: context.req.queries('kind'),
      category: context.req.queries('category'),
    })
    const result = await context.get('container').useCases.searchArtifacts.execute({
      ...(parsed.q === undefined ? {} : { text: parsed.q }),
      ...(parsed.kind === undefined ? {} : { kinds: parsed.kind }),
      ...(parsed.category === undefined ? {} : { categories: parsed.category }),
      ...(parsed.sort === undefined ? {} : { sort: parsed.sort }),
      ...(parsed.verified === undefined ? {} : { verifiedOnly: parsed.verified }),
      ...(parsed.limit === undefined ? {} : { limit: parsed.limit }),
      ...(parsed.offset === undefined ? {} : { offset: parsed.offset }),
    })
    return context.json(result)
  })

  routes.get('/artifacts/:id', async (context) => {
    const detail = await context
      .get('container')
      .useCases.getArtifactDetail.execute(context.req.param('id'))
    return context.json(detail)
  })

  routes.get('/artifacts/:id/install-plan', async (context) => {
    const parsed = installQuery.parse(context.req.query())
    const plan = await context.get('container').useCases.resolveInstallPlan.execute({
      artifactId: context.req.param('id'),
      ...(parsed.profile === undefined ? {} : { profile: parsed.profile }),
      ...(parsed.record === undefined ? {} : { recordInstall: parsed.record }),
    })
    return context.json(plan)
  })

  routes.get('/facets', async (context) => {
    const facets = await context.get('container').useCases.listCatalogFacets.execute()
    return context.json(facets)
  })

  return routes
}
