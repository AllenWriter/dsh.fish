import { DEFAULT_LOCALE, type Locale } from '@/shared/config/i18n'
import { isBlogSeries, type BlogSeries } from './series'
import generated from './manifest.generated.json'

export interface BlogManifestLocale {
  readonly title: string
  readonly description: string
  readonly author: string
  readonly date: string
}

export interface BlogManifestPost {
  readonly url: string
  readonly series: BlogSeries
  readonly slug: string
  readonly file: string
  readonly cover: string
  readonly locales: Readonly<Partial<Record<Locale, BlogManifestLocale>>>
}

interface BlogManifestFile {
  readonly posts: readonly {
    readonly url: string
    readonly series: string
    readonly slug: string
    readonly file: string
    readonly cover: string
    readonly locales: Record<string, BlogManifestLocale>
  }[]
}

const file = generated as BlogManifestFile

function asPost(post: BlogManifestFile['posts'][number]): BlogManifestPost {
  if (!isBlogSeries(post.series)) {
    throw new Error(`Blog manifest post ${post.url} has unknown series ${post.series}`)
  }
  if (post.locales[DEFAULT_LOCALE] === undefined) {
    throw new Error(`Blog manifest post ${post.url} is missing ${DEFAULT_LOCALE}`)
  }
  return {
    url: post.url,
    series: post.series,
    slug: post.slug,
    file: post.file,
    cover: post.cover,
    locales: post.locales,
  }
}

export const blogManifestPosts: readonly BlogManifestPost[] = file.posts.map(asPost)

export function localizedMdxFile(file: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return file
  const extension = file.lastIndexOf('.')
  return `${file.slice(0, extension)}.${locale}${file.slice(extension)}`
}

export function localeCopy(
  post: BlogManifestPost,
  locale: Locale,
): BlogManifestLocale {
  return post.locales[locale] ?? post.locales[DEFAULT_LOCALE]!
}

export function findBlogPost(url: string): BlogManifestPost | undefined {
  return blogManifestPosts.find((post) => post.url === url)
}
