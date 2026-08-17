import { data } from 'react-router'
import type { Route } from './+types/artifact-detail-page'
import { hubContext } from '@/shared/api/hub-context'
import { InstallPanel } from '@/widgets/install-panel/install-panel'
import { AuthorCard } from '@/entities/artifact/ui/author-card'
import { KindChip } from '@/entities/artifact/ui/kind-chip'
import { KindIcon } from '@/entities/artifact/ui/kind-icon'
import { CategoryIcon } from '@/entities/artifact/ui/category-icon'
import { artifactLd } from '@/entities/artifact/lib/artifact-ld'
import { kindLabelKey, kindPluralKey } from '@/entities/artifact/model/types'
import {
  DownloadsIcon,
  ExternalLinkIcon,
  HomeIcon,
  InstallsIcon,
  LicenseIcon,
  NextPageIcon,
  StarsIcon,
  UpdatedIcon,
  VerifiedIcon,
  WarningIcon,
  type Icon,
} from '@/shared/ui/icon'
import { requireLocale, translate, useLocale, useT } from '@/shared/config/i18n'
import { LocaleLink } from '@/shared/ui/locale-link'
import { Markdown } from '@/shared/ui/markdown'
import { breadcrumbLd, errorMeta, pageMeta } from '@/shared/lib/seo'
import { relativeTime } from '@/shared/lib/format'
import { AnimatedNumber } from '@/shared/ui/animated-number'

/**
 * A plugin page, which is the page this whole site exists to get indexed.
 *
 * The catalog row is language-neutral — the summary and readme are whatever the
 * author wrote upstream, and translating a third party's prose is not this
 * registry's to do. What *is* localized is the frame around it: the title
 * pattern, the type, the description sentence, the breadcrumb trail and the
 * `inLanguage` on the structured data. That is enough for one crawled artifact
 * to be a legitimate result in ten languages without inventing content for it.
 */
export function meta({ loaderData, params }: Route.MetaArgs): Route.MetaDescriptors {
  // A 404 renders the error boundary, so loaderData is absent there.
  if (!loaderData) return errorMeta(params.locale)

  const { artifact, plan, origin, locale } = loaderData
  const kindName = translate(locale, kindLabelKey(artifact.kind))

  return pageMeta({
    origin,
    locale,
    // Deliberately without `?profile=`: previewing the plan for another profile
    // is the same document, and every one of them must fold into this URL.
    path: `/a/${artifact.id}`,
    title: `${artifact.displayName} — ${kindName} · ${translate(locale, 'app.name')}`,
    description: translate(locale, 'seo.artifact.description', {
      summary: artifact.summary,
      kind: kindName,
    }),
    type: 'article',
    jsonLd: [
      artifactLd(origin, locale, artifact, plan.manualCommands),
      breadcrumbLd(origin, locale, [
        { name: translate(locale, 'app.name'), path: '/' },
        { name: translate(locale, kindPluralKey(artifact.kind)), path: `/kind/${artifact.kind}` },
        { name: artifact.displayName, path: `/a/${artifact.id}` },
      ]),
    ],
  })
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  const { container } = context.get(hubContext)
  const profile = new URL(request.url).searchParams.get('profile') ?? undefined

  const artifact = await container.useCases.getArtifactDetail
    .execute(params.artifactId)
    .catch(() => undefined)

  if (!artifact) {
    throw data({ message: translate(locale, 'notFound.body') }, { status: 404 })
  }

  // Previewing a plan is not installing: `recordInstall` stays off here, so the
  // install counter never becomes a page-view counter.
  const plan = await container.useCases.resolveInstallPlan.execute({
    artifactId: artifact.id,
    ...(profile === undefined ? {} : { profile }),
  })

  return { artifact, plan, locale, now: Date.now(), origin: container.config.baseUrl }
}

export default function ArtifactDetailPage({ loaderData }: Route.ComponentProps) {
  const { artifact, plan, now } = loaderData
  const t = useT()
  const locale = useLocale()

  return (
    <article className="mx-auto w-full min-w-0 max-w-6xl px-6 py-10">
      <header className="border-b border-border pb-8">
        {/* A visible trail, matching the BreadcrumbList in the head. A crawler
            reads both; a reader arriving from a search result only has this
            one to tell them where in the catalog they landed. */}
        <nav aria-label={t('browse.title')} className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <LocaleLink
                to="/"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <HomeIcon className="size-3.5" />
                {t('app.name')}
              </LocaleLink>
            </li>
            {/* A caret rather than a slash: the trail points one step further in,
                and a glyph says that where a punctuation mark only separates. */}
            <li aria-hidden className="flex items-center">
              <NextPageIcon className="size-3.5 opacity-60" />
            </li>
            <li>
              <LocaleLink
                to={`/kind/${artifact.kind}`}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <KindIcon kind={artifact.kind} className="size-3.5" weight="regular" />
                {t(kindPluralKey(artifact.kind))}
              </LocaleLink>
            </li>
          </ol>
        </nav>

        <div className="mt-4 grid min-w-0 items-start gap-x-8 gap-y-6 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <KindChip kind={artifact.kind} />
              {artifact.verified ? (
                <span
                  title={t('artifact.verifiedTitle')}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  <VerifiedIcon className="size-3.5" weight="fill" />
                  {t('artifact.verified')}
                </span>
              ) : null}
              {artifact.deprecated ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                  <WarningIcon className="size-3.5" weight="bold" />
                  {t('artifact.deprecated')}
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{artifact.displayName}</h1>
            <p className="mt-2 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {artifact.summary}
            </p>

            <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {artifact.stats.installs > 0 ? (
                <Metric
                  icon={InstallsIcon}
                  label={t('artifact.installs')}
                  value={artifact.stats.installs}
                />
              ) : null}
              {artifact.stats.stars > 0 ? (
                <Metric icon={StarsIcon} label={t('artifact.stars')} value={artifact.stats.stars} />
              ) : null}
              {artifact.stats.downloads > 0 ? (
                <Metric
                  icon={DownloadsIcon}
                  label={t('artifact.downloads')}
                  value={artifact.stats.downloads}
                />
              ) : null}
              {artifact.license ? (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">{t('artifact.license')}</dt>
                  <dd className="inline-flex items-center gap-1.5">
                    <LicenseIcon className="size-3.5" />
                    {artifact.license}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">{t('artifact.updated')}</dt>
                <dd className="inline-flex items-center gap-1.5">
                  <UpdatedIcon className="size-3.5" />
                  {t('artifact.updated')}{' '}
                  {/* A machine-readable date beside the human one: "3 days ago" is
                      unparseable, and freshness is a real ranking input here. */}
                  <time dateTime={artifact.updatedAt}>
                    {relativeTime(artifact.updatedAt, now, locale)}
                  </time>
                </dd>
              </div>
            </dl>

            {artifact.categories.length > 0 ? (
              <>
                <h2 className="sr-only">{t('artifact.categories')}</h2>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {artifact.categories.map((category) => (
                    <li key={category}>
                      <LocaleLink
                        to={`/category/${category}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                      >
                        <CategoryIcon id={category} className="size-3.5" />
                        {t(`category.${category}`)}
                      </LocaleLink>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {artifact.keywords.length > 0 ? (
              <>
                <h2 className="sr-only">{t('artifact.keywords')}</h2>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {artifact.keywords.slice(0, 12).map((keyword) => (
                    <li key={keyword}>
                      <LocaleLink
                        to={`/browse?q=${encodeURIComponent(keyword)}`}
                        rel="nofollow"
                        className="inline-flex rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                      >
                        {keyword}
                      </LocaleLink>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {artifact.author ? <AuthorCard author={artifact.author} /> : null}
            <a
              href={artifact.sourceUrl}
              target="_blank"
              // `ugc`: the source URL is supplied by whoever submitted the row, so
              // the catalog does not pass its own authority to it.
              rel="noreferrer noopener ugc"
              className="press flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:border-border-strong"
            >
              {t('artifact.source')}
              <ExternalLinkIcon className="size-4 text-muted-foreground" weight="bold" />
            </a>
          </div>
        </div>
      </header>

      {/* `min-w-0` is what lets a wide table or fence scroll inside the
          column instead of stretching the grid — grid items default to
          `min-width: auto`, which is the content's intrinsic width. */}
      <div className="grid min-w-0 gap-10 pt-8 lg:grid-cols-[1fr_22rem]">
        <section id="readme" className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{t('artifact.readme')}</h2>
          {artifact.readmeMarkdown ? (
            // The bases are what a relative path inside the readme resolves
            // against — the readme was written against its own repository, not
            // against this page. See `Markdown` for why rendering a crawled
            // readme is safe.
            <Markdown
              source={artifact.readmeMarkdown}
              docBase={artifact.sourceDocBase}
              assetBase={artifact.sourceAssetBase}
              className="mt-5"
            />
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t('artifact.noReadme')}</p>
          )}
        </section>

        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <InstallPanel artifact={artifact} plan={plan} />
        </div>
      </div>
    </article>
  )
}

/**
 * One counted fact about the artifact.
 *
 * The same glyphs a catalog card uses for the same numbers, so a reader who
 * learned "star means stars" in the grid does not relearn it here.
 */
function Metric({ icon: Icon, label, value }: { icon: Icon; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="sr-only">{label}</dt>
      <dd className="inline-flex items-center gap-1.5">
        <Icon className="size-3.5" />
        <span className="font-medium tabular-nums text-foreground">
          <AnimatedNumber value={value} />
        </span>{' '}
        {label}
      </dd>
    </div>
  )
}
