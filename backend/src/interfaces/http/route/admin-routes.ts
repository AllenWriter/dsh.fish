import { Hono } from 'hono'
import { z } from 'zod'
import { requireAdmin } from '../../../domain/account/account.js'
import type { HubBindings } from '../app.js'

// Capped well under the search API's own ceiling: a manual sweep runs in the
// same Worker invocation, and so under the same subrequest budget, as the cron.
const ingestLimit = z.number().int().min(1).max(250)

const ingestBody = z.object({
  limitPerSource: ingestLimit.optional(),
  limitByOrigin: z
    .object({
      github: ingestLimit.optional(),
      npm: ingestLimit.optional(),
      'awesome-list': ingestLimit.optional(),
    })
    .optional(),
})

const reclassifyBody = z.object({
  limit: ingestLimit.optional(),
  offset: z.number().int().min(0).optional(),
})

/**
 * Operator surface. Every route here re-checks administrator rights rather than
 * trusting the mount path, so moving the router cannot silently open it up.
 */
export function adminRoutes() {
  const routes = new Hono<HubBindings>()

  routes.post('/ingest', async (context) => {
    requireAdmin(context.get('actor'))
    const body = ingestBody.parse(await context.req.json().catch(() => ({})))
    const report = await context.get('container').useCases.ingestCatalog.execute(body)
    return context.json(report)
  })

  routes.post('/reclassify', async (context) => {
    requireAdmin(context.get('actor'))
    const body = reclassifyBody.parse(await context.req.json().catch(() => ({})))
    const report = await context.get('container').useCases.reclassifyCatalog.execute(body)
    return context.json(report)
  })

  routes.get('/submissions/pending', async (context) => {
    requireAdmin(context.get('actor'))
    const list = await context.get('container').submissions.listPending(100)
    return context.json({
      items: list.map((submission) => ({
        id: submission.id,
        accountId: submission.accountId,
        kind: submission.kind,
        source: submission.source,
        note: submission.note ?? null,
        createdAt: submission.createdAt.toISOString(),
      })),
    })
  })

  return routes
}
