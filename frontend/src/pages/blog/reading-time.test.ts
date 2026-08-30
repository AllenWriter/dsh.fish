import { describe, expect, it } from 'vitest'
import { readingMinutesFromMarkdown } from './reading-time'

describe('readingMinutesFromMarkdown', () => {
  it('uses 200 wpm for Latin copy and ignores frontmatter', () => {
    const words = Array.from({ length: 400 }, () => 'word').join(' ')
    expect(
      readingMinutesFromMarkdown(`---\ntitle: Test\n---\n\n${words}\n`),
    ).toBe(2)
  })

  it('uses 400 characters per minute for CJK copy', () => {
    const chars = '字'.repeat(800)
    expect(readingMinutesFromMarkdown(chars)).toBe(2)
  })

  it('never reports less than one minute', () => {
    expect(readingMinutesFromMarkdown('Hi.')).toBe(1)
  })
})
