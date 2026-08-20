import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ZodError } from 'zod'
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

  // A body or query that fails schema validation is a client error, not a
  // server one: same envelope, with the field paths as the details.
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'The request did not match the expected shape.',
          details: { issues: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) },
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
