import { DomainError } from '../shared/error.js'

/**
 * The domain's read-only view of an authenticated principal.
 *
 * Better Auth owns identity storage, sessions, OAuth and the device grant; the
 * domain only needs to know who is acting and what they may do. Keeping the
 * view this thin is what stops auth-library types leaking into use cases.
 */
export interface Account {
  readonly id: string
  readonly displayName: string
  readonly email?: string
  readonly avatarUrl?: string
  readonly isAdmin: boolean
}

/** How the current request authenticated. Device tokens are deliberately weaker. */
export type ActorChannel = 'session' | 'device-token'

export interface Actor {
  readonly account: Account
  readonly channel: ActorChannel
}

export function requireActor(actor: Actor | undefined): Actor {
  if (!actor) {
    throw DomainError.unauthenticated('Sign in to perform this action.')
  }
  return actor
}

export function requireAdmin(actor: Actor | undefined): Actor {
  const resolved = requireActor(actor)
  if (!resolved.account.isAdmin) {
    throw DomainError.forbidden('This action requires an administrator.')
  }
  return resolved
}

/**
 * A device token authenticates a CLI, not a browser session. It may read the
 * catalog and resolve install plans on the user's behalf, but it may not
 * perform account-shaped writes such as submitting or claiming an artifact —
 * those need a real session, where the user can see what they are approving.
 */
export function requireInteractiveSession(actor: Actor | undefined): Actor {
  const resolved = requireActor(actor)
  if (resolved.channel !== 'session') {
    throw DomainError.forbidden('This action must be performed in a signed-in browser session.')
  }
  return resolved
}
