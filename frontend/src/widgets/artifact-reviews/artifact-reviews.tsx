import type { ArtifactReviewsDto, ReviewDto } from '@/entities/artifact/model/types'
import { useLocale, useT } from '@/shared/config/i18n'
import { relativeTime } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { Avatar } from '@/shared/ui/avatar'
import { StarsIcon } from '@/shared/ui/icon'

/**
 * Community ratings on a plugin page.
 *
 * A rail card, same surface as the install panel and the README badge, so the
 * comments stay beside the readme instead of waiting below it. Always rendered
 * — an empty card still points at the harness write path.
 *
 * Read-only on purpose: the write path lives in the dsh harness (the hub
 * plugin's rate tool, or `dsh-fish rate`), so this section renders what the
 * registry holds and points at the place a rating can actually come from. A
 * form here would be a second, weaker write path and a spam surface.
 *
 * Server-rendered like the rest of the page, so the aggregate and the comments
 * are part of the document a crawler indexes.
 */
export function ArtifactReviews({ reviews, now }: { reviews: ArtifactReviewsDto; now: number }) {
  const t = useT()
  const { summary } = reviews

  return (
    <section aria-labelledby="reviews-title" className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="reviews-title" className="text-base font-semibold tracking-tight">
          {t('artifact.reviews.title')}
        </h2>
        {summary.count > 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('artifact.reviews.ratingCount', { count: summary.count })}
          </p>
        ) : null}
      </div>

      {summary.count === 0 || summary.average === null ? (
        <p className="mt-3 text-sm text-muted-foreground">{t('artifact.reviews.empty')}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
            <div>
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {summary.average.toFixed(1)}
              </span>
              <Stars
                value={summary.average}
                label={t('artifact.reviews.averageOutOf', {
                  average: summary.average,
                  max: reviews.scale.max,
                })}
                className="mt-1.5"
              />
            </div>
            <Distribution reviews={reviews} />
          </div>

          {reviews.items.length > 0 ? (
            <ul className="mt-4 max-h-80 divide-y divide-border overflow-y-auto overscroll-contain border-t border-border">
              {reviews.items.map((review) => (
                <ReviewItem
                  key={`${review.author.name}:${review.createdAt}`}
                  review={review}
                  now={now}
                />
              ))}
            </ul>
          ) : null}
        </>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {t('artifact.reviews.readOnly', {
          command: `dsh-fish rate ${reviews.artifactId} <1-5>`,
        })}
      </p>
    </section>
  )
}

/**
 * Five glyphs, filled up to the rounded value. Fill state carries the meaning,
 * so the row stays in the foreground colour rather than claiming a hue —
 * amber on this page already means the S grade, and a second amber system
 * would make both unreadable.
 */
function Stars({
  value,
  label,
  className,
}: {
  value: number
  label?: string
  className?: string
}) {
  const filled = Math.round(value)
  return (
    <span
      role="img"
      aria-label={label ?? `${value}`}
      className={cn('flex items-center gap-0.5', className)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <StarsIcon
          key={star}
          aria-hidden
          weight={star <= filled ? 'fill' : 'regular'}
          className={cn('size-4', star <= filled ? 'text-foreground' : 'text-muted-foreground/50')}
        />
      ))}
    </span>
  )
}

/** One row per star value, 5 down to 1, sized by share of all ratings. */
function Distribution({ reviews }: { reviews: ArtifactReviewsDto }) {
  const { count, distribution } = reviews.summary
  return (
    <ol className="flex min-w-0 flex-col gap-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const n = distribution[star - 1] ?? 0
        const width = count === 0 ? 0 : (n / count) * 100
        return (
          <li key={star} className="grid grid-cols-[auto_minmax(0,1fr)_2ch] items-center gap-2.5">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className="tabular-nums">{star}</span>
              <StarsIcon weight="fill" className="size-3" aria-hidden />
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-foreground/60"
                style={{ width: `${width}%` }}
              />
            </span>
            <span className="text-right text-xs tabular-nums text-muted-foreground">{n}</span>
          </li>
        )
      })}
    </ol>
  )
}

function ReviewItem({ review, now }: { review: ReviewDto; now: number }) {
  const t = useT()
  const locale = useLocale()
  return (
    <li className="py-3">
      <div className="flex items-start gap-2.5">
        <Avatar name={review.author.name} src={review.author.avatarUrl ?? null} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 truncate text-sm font-medium">{review.author.name}</span>
            <Stars
              value={review.rating}
              label={t('artifact.reviews.averageOutOf', {
                average: review.rating,
                max: 5,
              })}
            />
            <time className="text-xs text-muted-foreground" dateTime={review.updatedAt}>
              {relativeTime(review.updatedAt, now, locale)}
            </time>
          </div>
          {review.comment ? (
            <p className="mt-1.5 break-words text-sm leading-relaxed">{review.comment}</p>
          ) : null}
        </div>
      </div>
    </li>
  )
}
