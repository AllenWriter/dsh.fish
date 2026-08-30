import type { Route } from './+types/feed'
import { hubContext } from '@/shared/api/hub-context'
import { DEFAULT_LOCALE, localeDefinition, requireLocale, translate } from '@/shared/config/i18n'
import { absoluteUrl } from '@/shared/lib/seo'
import { atomFeedXml, atomResponse } from '@/pages/seo/atom'
import { listBlogPosts } from './source'

/**
 * `/blog/feed.xml`, and one per language at `/<locale>/blog/feed.xml`.
 *
 * Same Atom contract as the catalog feed. Entry ids are the English post URL
 * so a reader switching languages does not see every post as new.
 */
export async function loader({ context, params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  const { baseUrl } = context.get(hubContext).container.config
  const posts = listBlogPosts(locale)
  if (posts.length === 0) {
    throw new Error('Blog Atom feed has no posts')
  }
  const updatedAt = posts[0]!.date

  return atomResponse(
    atomFeedXml({
      selfUrl: absoluteUrl(baseUrl, locale, '/blog/feed.xml'),
      alternateUrl: absoluteUrl(baseUrl, locale, '/blog'),
      title: translate(locale, 'feed.blog.title'),
      subtitle: translate(locale, 'feed.blog.description'),
      lang: localeDefinition(locale).tag,
      authorName: translate(locale, 'app.name'),
      updatedAt,
      entries: posts.map((post) => ({
        id: absoluteUrl(baseUrl, DEFAULT_LOCALE, post.url),
        url: absoluteUrl(baseUrl, locale, post.url),
        title: post.title,
        ...(post.description === '' ? {} : { summary: post.description }),
        updatedAt: post.date,
      })),
    }),
  )
}
