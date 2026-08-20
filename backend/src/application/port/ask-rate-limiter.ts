/**
 * Abuse control for anonymous artifact ask. Budgets live in KV; the port is
 * what the use case sees so tests can substitute a fake.
 */
export interface AskLease {
  /** Decrement the concurrent-stream counter. Safe to call more than once. */
  release(): Promise<void>
}

export interface AskRateLimiter {
  /**
   * Consume one ask against the IP, artifact, and global budgets.
   * Throws `RATE_LIMITED` when a budget is exhausted, `UNAVAILABLE` when the
   * Ada circuit is open.
   */
  consume(input: { readonly ip: string; readonly artifactId: string }): Promise<AskLease>
  /** Trip the Ada circuit after an upstream 429. */
  tripCircuit(retryAfterSeconds?: number): Promise<void>
}
