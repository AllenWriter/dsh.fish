import { describe, expect, it } from 'vitest'
import { DomainError } from '../shared/error.js'
import { Review } from './review.js'

function input(overrides: Partial<Parameters<typeof Review.rate>[0]> = {}) {
  return {
    artifactId: 'dsh-postgres-mcp',
    accountId: 'account-1',
    authorName: 'Ada',
    rating: 4,
    ...overrides,
  }
}

describe('Review.rate', () => {
  it('accepts a bare rating without a comment', () => {
    const review = Review.rate(input())
    expect(review.rating).toBe(4)
    expect(review.comment).toBeUndefined()
    expect(review.createdAt).toEqual(review.updatedAt)
  })

  it('trims the comment and drops one that is only whitespace', () => {
    expect(Review.rate(input({ comment: '  works well  ' })).comment).toBe('works well')
    expect(Review.rate(input({ comment: '   ' })).comment).toBeUndefined()
  })

  it.each([0, 6, -1, 3.5, Number.NaN])('rejects rating %s', (rating) => {
    expect(() => Review.rate(input({ rating }))).toThrowError(DomainError)
  })

  it.each([1, 5])('accepts the boundary rating %s', (rating) => {
    expect(Review.rate(input({ rating })).rating).toBe(rating)
  })

  it('rejects a comment over the length limit', () => {
    expect(() => Review.rate(input({ comment: 'x'.repeat(2001) }))).toThrowError(DomainError)
    expect(Review.rate(input({ comment: 'x'.repeat(2000) })).comment).toHaveLength(2000)
  })

  it('requires an identifiable reviewer', () => {
    expect(() => Review.rate(input({ accountId: ' ' }))).toThrowError(DomainError)
    expect(() => Review.rate(input({ authorName: '' }))).toThrowError(DomainError)
  })
})
