import { DomainError } from './error.js'

export const DEFAULT_PAGE_SIZE = 24
export const MAX_PAGE_SIZE = 100

export interface PageRequest {
  readonly limit: number
  readonly offset: number
}

export interface Page<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly limit: number
  readonly offset: number
}

export function pageRequest(limit?: number, offset?: number): PageRequest {
  const resolvedLimit = limit ?? DEFAULT_PAGE_SIZE
  const resolvedOffset = offset ?? 0
  if (!Number.isInteger(resolvedLimit) || resolvedLimit < 1 || resolvedLimit > MAX_PAGE_SIZE) {
    throw DomainError.invalid(`limit must be an integer between 1 and ${MAX_PAGE_SIZE}.`, { limit })
  }
  if (!Number.isInteger(resolvedOffset) || resolvedOffset < 0) {
    throw DomainError.invalid('offset must be a non-negative integer.', { offset })
  }
  return { limit: resolvedLimit, offset: resolvedOffset }
}

export function page<T>(items: readonly T[], total: number, request: PageRequest): Page<T> {
  return { items, total, limit: request.limit, offset: request.offset }
}
