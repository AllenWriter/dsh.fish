import { describe, expect, it } from 'vitest'
import { movedBlogPostRedirect } from './moved-blog-path'

describe('movedBlogPostRedirect', () => {
  it('folds a moved Nio episode onto /blog/podcast/{slug}', () => {
    expect(movedBlogPostRedirect('/blog/life/riddle-quiz-1')).toBe('/blog/podcast/riddle-quiz-1')
    expect(movedBlogPostRedirect('/blog/tech/moon-landing-hard-tech')).toBe(
      '/blog/podcast/moon-landing-hard-tech',
    )
    expect(movedBlogPostRedirect('/blog/finance/bullshit-jobs')).toBe('/blog/podcast/bullshit-jobs')
    expect(movedBlogPostRedirect('/blog/travel/japan-trip-notes')).toBe(
      '/blog/podcast/japan-trip-notes',
    )
  })

  it('keeps a locale prefix, a markdown alias and the query', () => {
    expect(movedBlogPostRedirect('/en/blog/life/riddle-quiz-1')).toBe('/en/blog/podcast/riddle-quiz-1')
    expect(movedBlogPostRedirect('/ja/blog/tech/why-220v-and-110v')).toBe(
      '/ja/blog/podcast/why-220v-and-110v',
    )
    expect(movedBlogPostRedirect('/blog/life/riddle-quiz-1.md')).toBe('/blog/podcast/riddle-quiz-1.md')
    expect(movedBlogPostRedirect('/en/blog/finance/trump-family-prequel.md', '?utm=1')).toBe(
      '/en/blog/podcast/trump-family-prequel.md?utm=1',
    )
  })

  it('leaves a kept post, the new URL, and a series landing alone', () => {
    expect(movedBlogPostRedirect('/blog/life/first-blog')).toBeUndefined()
    expect(movedBlogPostRedirect('/blog/tech/one-inbox')).toBeUndefined()
    expect(movedBlogPostRedirect('/blog/finance/dont-dca-qqq')).toBeUndefined()
    expect(movedBlogPostRedirect('/blog/podcast/riddle-quiz-1')).toBeUndefined()
    expect(movedBlogPostRedirect('/blog/life')).toBeUndefined()
    expect(movedBlogPostRedirect('/blog')).toBeUndefined()
  })
})
