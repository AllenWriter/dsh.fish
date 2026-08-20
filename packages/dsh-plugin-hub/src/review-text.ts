import type { ArtifactReviews } from './hub-client.js'

/** Width of one distribution bar, in characters. */
const BAR_WIDTH = 20

/**
 * Plain-text rendering of community ratings, shared by the hub plugin's tool
 * output and the CLI. An agent reads this verbatim, so it carries the scale,
 * the aggregate, the distribution and the comments — never a bare average the
 * reader has to interpret on its own.
 */
export function renderArtifactReviews(reviews: ArtifactReviews): string {
  const { summary } = reviews
  if (summary.count === 0 || summary.average === null) {
    return `No ratings yet for ${reviews.artifactId}.`
  }

  const lines = [
    `${summary.average.toFixed(1)} / ${reviews.scale.max} from ${summary.count} rating(s):`,
  ]
  for (let star = reviews.scale.max; star >= reviews.scale.min; star -= 1) {
    const n = summary.distribution[star - 1] ?? 0
    const width = Math.round((n / summary.count) * BAR_WIDTH)
    lines.push(`${star} ★ ${'█'.repeat(width)}${'·'.repeat(BAR_WIDTH - width)} ${n}`)
  }

  const comments = reviews.items.filter((item) => item.comment !== undefined)
  if (comments.length > 0) {
    lines.push('', 'Recent comments:')
    for (const item of comments) {
      lines.push(`${item.author.name} — ${item.rating} ★`, `    ${item.comment}`)
    }
  }
  return lines.join('\n')
}
