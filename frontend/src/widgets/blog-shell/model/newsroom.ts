import type { BlogPostCard } from './types'

export const NEWSROOM_PAGE_SIZE = 8
export const ALL_SERIES = 'all'

export function filterNewsroomPosts(
  posts: readonly BlogPostCard[],
  seriesId: string,
): readonly BlogPostCard[] {
  if (seriesId === ALL_SERIES) return posts
  return posts.filter((post) => post.seriesId === seriesId)
}

export function paginateNewsroomPosts(
  posts: readonly BlogPostCard[],
  seriesId: string,
  limit: number,
): readonly BlogPostCard[] {
  return filterNewsroomPosts(posts, seriesId).slice(0, limit)
}
