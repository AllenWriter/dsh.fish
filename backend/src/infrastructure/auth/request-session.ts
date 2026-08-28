import type { ActorChannel } from '../../domain/account/account.js'
import type { HubAuth } from './auth.js'

/**
 * The user Better Auth returns from a session read. The domain Account is
 * built from this in the HTTP adapter; this module only answers "is there a
 * session on this request, and how did it arrive".
 */
export interface AuthUser {
  readonly id: string
  readonly name: string
  readonly email?: string | null
  readonly image?: string | null
}

export interface RequestSession {
  readonly user: AuthUser
  readonly channel: ActorChannel
}

/**
 * The device grant returns `session.token` as `access_token`. Better Auth's
 * bearer plugin expects a signed cookie value (`token.signature`) instead, so
 * `auth.api.getSession` with `Authorization: Bearer <access_token>` does not
 * see the session. Look the raw token up in the session store first.
 */
export function bearerCredential(authorization: string | null): string | undefined {
  if (authorization === null) return undefined
  if (!authorization.toLowerCase().startsWith('bearer ')) return undefined
  const token = authorization.slice(7).trim()
  return token === '' ? undefined : token
}

/** Strip an optional HMAC suffix so a `set-auth-token` value still looks up. */
export function sessionTokenFromCredential(credential: string): string {
  const separator = credential.indexOf('.')
  return separator === -1 ? credential : credential.slice(0, separator)
}

export async function readRequestSession(
  auth: HubAuth,
  request: Request,
): Promise<RequestSession | undefined> {
  const credential = bearerCredential(request.headers.get('authorization'))
  if (credential !== undefined) {
    return readBearerSession(auth, credential)
  }

  let session: Awaited<ReturnType<HubAuth['api']['getSession']>>
  try {
    session = await auth.api.getSession({ headers: request.headers })
  } catch (error) {
    console.error('session_resolution_failed', {
      message: error instanceof Error ? error.message : String(error),
    })
    return undefined
  }
  if (!session?.user) return undefined
  return { user: session.user, channel: 'session' }
}

async function readBearerSession(
  auth: HubAuth,
  credential: string,
): Promise<RequestSession | undefined> {
  try {
    const context = await auth.$context
    const found = await context.internalAdapter.findSession(
      sessionTokenFromCredential(credential),
    )
    if (!found?.user) return undefined
    if (new Date(found.session.expiresAt) < new Date()) return undefined
    return { user: found.user, channel: 'device-token' }
  } catch (error) {
    console.error('bearer_session_resolution_failed', {
      message: error instanceof Error ? error.message : String(error),
    })
    return undefined
  }
}
