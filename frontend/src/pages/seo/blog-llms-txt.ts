import type { Route } from './+types/blog-llms-txt'
import { hubContext } from '@/shared/api/hub-context'
import { DEFAULT_LOCALE, translate } from '@/shared/config/i18n'
import { markdownPath } from '@/shared/lib/seo'
import { BLOG_SERIES, seriesTitleKey } from '@/pages/blog'
import { blogLlmsTxt, llmsTxtResponse } from './llms'
import { blogPostPaths, listBlogPosts } from '@/pages/blog/source'

/**
 * `/blog/llms.txt` — the blog overview for agents (llmstxt.org v2).
 *
 * File lists are generated from the blog manifest so a post added to
 * `content/blog` appears here in the same commit.
 */
export function loader({ context }: Route.LoaderArgs) {
  const { baseUrl } = context.get(hubContext).container.config
  const posts = listBlogPosts(DEFAULT_LOCALE)
  const body = blogLlmsTxt(
    baseUrl,
    BLOG_SERIES.map((series) => ({
      title: translate(DEFAULT_LOCALE, seriesTitleKey(series)),
      url: `/blog/${series}`,
    })),
    posts.map((post) => ({ title: post.title, url: post.url })),
  )
  const missing = ['/blog', ...BLOG_SERIES.map((series) => `/blog/${series}`), ...blogPostPaths()].filter(
    (path) => !body.includes(`${baseUrl.replace(/\/+$/, '')}${markdownPath(path)}`),
  )
  if (missing.length > 0) {
    throw new Error(`blog llms.txt is missing ${missing.join(', ')}`)
  }
  return llmsTxtResponse(body)
}
