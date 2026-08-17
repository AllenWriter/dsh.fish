/**
 * Who an account is on the source host it linked.
 *
 * Read on demand rather than cached on the account. Better Auth records the
 * provider's own id for a linked identity when the OAuth flow completes, and
 * that id is the durable half of the identity: a GitHub login can be renamed,
 * and a freed login can be taken by someone else, so a login copied into this
 * hub's own tables would eventually name the wrong person. Ownership here
 * decides whether a submission publishes without review, which is not a claim
 * to settle against a stale copy.
 */
export interface LinkedIdentityReader {
  /**
   * GitHub's numeric user id for this account, or undefined when no GitHub
   * identity is linked — an email-and-password account, for instance.
   */
  githubUserId(accountId: string): Promise<string | undefined>
}
