import { and, eq } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { LinkedIdentityReader } from '../../application/port/linked-identity.js'
import { accounts } from './auth-schema.js'
import * as schema from './schema.js'

type Db = DrizzleD1Database<typeof schema>

/** The provider id Better Auth stores for the GitHub social provider. */
const GITHUB_PROVIDER = 'github'

/**
 * Reads the linked identity out of Better Auth's own tables.
 *
 * Better Auth owns identity storage, so this is a read of its rows rather than
 * a column of the hub's: `accounts.account_id` holds the provider's id for the
 * link, written when the OAuth callback succeeded and never client-settable.
 */
export class D1LinkedIdentityReader implements LinkedIdentityReader {
  constructor(private readonly db: Db) {}

  async githubUserId(accountId: string): Promise<string | undefined> {
    const rows = await this.db
      .select({ providerAccountId: accounts.accountId })
      .from(accounts)
      .where(and(eq(accounts.userId, accountId), eq(accounts.providerId, GITHUB_PROVIDER)))
      .limit(1)
    const found = rows[0]?.providerAccountId
    return found === undefined || found === null || found === '' ? undefined : found
  }
}
