import { Hono } from 'hono'
import { z } from 'zod'
import type { HubBindings } from '../app.js'

const reviewsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const rateBody = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
})

/**
 * Community ratings. Reading is anonymous like the rest of the catalog; the
 * write side needs any authenticated actor — a browser session or the device
 * token a harness holds — because a rating only ever speaks for the account
 * behind the token. There is deliberately no endpoint to rate as someone else
 * or to list another account's ratings.
 */
export function reviewRoutes() {
  const routes = new Hono<HubBindings>()

  routes.get('/artifacts/:id/reviews', async (context) => {
    const parsed = reviewsQuery.parse(context.req.query())
    const result = await context
      .get('container')
      .useCases.getArtifactReviews.execute(
        context.req.param('id'),
        ...(parsed.limit === undefined ? [] : [parsed.limit]),
      )
    return context.json(result)
  })

  routes.put('/artifacts/:id/reviews/mine', async (context) => {
    const body = rateBody.parse(await context.req.json())
    const result = await context
      .get('container')
      .useCases.rateArtifact.execute(context.get('actor'), {
        artifactId: context.req.param('id'),
        rating: body.rating,
        ...(body.comment === undefined ? {} : { comment: body.comment }),
      })
    return context.json(result)
  })

  return routes
}
