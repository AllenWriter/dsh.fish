import { Hono } from 'hono'
import { z } from 'zod'
import { ARTIFACT_KINDS } from '../../../domain/artifact/artifact-kind.js'
import { requireInteractiveSession } from '../../../domain/account/account.js'
import type { HubBindings } from '../app.js'

const submitBody = z.object({
  kind: z.enum(ARTIFACT_KINDS),
  sourceSpec: z.string().min(3).max(300),
  note: z.string().max(1000).optional(),
})

/** Authenticated write surface for plugin authors. */
export function submissionRoutes() {
  const routes = new Hono<HubBindings>()

  routes.post('/submissions', async (context) => {
    const body = submitBody.parse(await context.req.json())
    const result = await context
      .get('container')
      .useCases.submitArtifact.execute(context.get('actor'), body)
    return context.json(result, result.status === 'approved' ? 201 : 202)
  })

  routes.get('/submissions/mine', async (context) => {
    const actor = requireInteractiveSession(context.get('actor'))
    const list = await context.get('container').submissions.listByAccount(actor.account.id)
    return context.json({
      items: list.map((submission) => ({
        id: submission.id,
        kind: submission.kind,
        status: submission.status,
        artifactId: submission.artifactId ?? null,
        reviewerNote: submission.reviewerNote ?? null,
        createdAt: submission.createdAt.toISOString(),
      })),
    })
  })

  routes.get('/me', async (context) => {
    const actor = context.get('actor')
    if (!actor) return context.json({ account: null })
    return context.json({
      account: {
        id: actor.account.id,
        displayName: actor.account.displayName,
        avatarUrl: actor.account.avatarUrl ?? null,
        isAdmin: actor.account.isAdmin,
      },
      channel: actor.channel,
    })
  })

  return routes
}
