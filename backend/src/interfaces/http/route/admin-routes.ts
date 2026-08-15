import { Hono } from 'hono'
import { z } from 'zod'
import { requireAdmin } from '../../../domain/account/account.js'
import type { HubBindings } from '../app.js'

const ingestBody = z.object({
  limitPerSource: z.number().int().min(1).max(250).optional(),
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
