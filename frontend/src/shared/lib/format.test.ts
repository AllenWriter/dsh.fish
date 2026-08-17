import { describe, expect, it } from 'vitest'
import { compactNumber, compactNumberParts } from './format'

describe('compactNumber', () => {
  it('keeps small counts as integers', () => {
    expect(compactNumber(0)).toBe('0')
    expect(compactNumber(999)).toBe('999')
  })

  it('uses a lowercase k/M suffix that does not depend on ICU', () => {
    expect(compactNumber(1200)).toBe('1.2k')
    expect(compactNumber(10_000)).toBe('10k')
    expect(compactNumber(1_500_000)).toBe('1.5M')
  })

  it('splits into parts NumberFlow can animate without calling Intl', () => {
    expect(compactNumberParts(1200)).toEqual({ value: 1.2, suffix: 'k', fractionDigits: 1 })
    expect(compactNumberParts(412)).toEqual({ value: 412, suffix: '', fractionDigits: 0 })
  })
})
