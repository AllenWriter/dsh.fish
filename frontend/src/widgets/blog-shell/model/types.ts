export interface BlogTocItem {
  readonly title: string
  readonly url: string
  readonly depth: number
}

export interface BlogSeriesNavItem {
  readonly id: string
  readonly href: string
  readonly title: string
}

export interface BlogPostCard {
  readonly url: string
  readonly title: string
  readonly description: string
  readonly date: string
  readonly seriesId: string
  readonly seriesTitle: string
  readonly cover: string
}
