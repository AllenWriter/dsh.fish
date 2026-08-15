import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { isDomainError } from '../../domain/shared/error.js'
import type { DomainErrorCode } from '../../domain/shared/error.js'

/**
 * The single error envelope every endpoint returns, per
 * `docs/backend/api-conventions.md`. Clients switch on `error.code`, never on
 * the HTTP status alone.
 */
export interface ApiErrorBody {
  readonly error: {
    readonly code: string
    readonly message: string
    readonly details?: Readonly<Record<string, unknown>>
  }
}

const STATUS_BY_CODE: Readonly<Record<DomainErrorCode, ContentfulStatusCode>> = {
  INVALID_ARGUMENT: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  ALREADY_EXISTS: 409,
  UNSUPPORTED: 422,
}

export function toApiError(error: unknown): {
  status: ContentfulStatusCode
  body: ApiErrorBody
} {
  if (isDomainError(error)) {
    return {
      status: STATUS_BY_CODE[error.code],
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(Object.keys(error.details).length === 0 ? {} : { details: error.details }),
        },
      },
    }
  }

  // An unexpected failure never leaks its message: it may carry a binding name,
  // a query fragment, or an upstream token.
  return {
    status: 500,
    body: { error: { code: 'INTERNAL', message: 'Unexpected server error.' } },
  }
}
