/**
 * Domain-level failures. The domain never throws framework or transport errors;
 * `interfaces` maps these codes onto HTTP status codes.
 */
export type DomainErrorCode =
  | 'INVALID_ARGUMENT'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'UNAUTHENTICATED'
  | 'UNSUPPORTED'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'

export class DomainError extends Error {
  readonly code: DomainErrorCode
  readonly details: Readonly<Record<string, unknown>>

  constructor(code: DomainErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.details = Object.freeze({ ...details })
  }

  static invalid(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('INVALID_ARGUMENT', message, details)
  }

  static notFound(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('NOT_FOUND', message, details)
  }

  static alreadyExists(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('ALREADY_EXISTS', message, details)
  }

  static conflict(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('CONFLICT', message, details)
  }

  static forbidden(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('FORBIDDEN', message, details)
  }

  static unauthenticated(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('UNAUTHENTICATED', message, details)
  }

  static unsupported(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('UNSUPPORTED', message, details)
  }

  static rateLimited(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('RATE_LIMITED', message, details)
  }

  static unavailable(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('UNAVAILABLE', message, details)
  }
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError
}
