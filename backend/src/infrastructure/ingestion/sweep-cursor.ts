import type { KVNamespace } from '@cloudflare/workers-types'

/**
 * Where the next crawl resumes.
 *
 * A sweep cannot read the whole topic in one Worker invocation — subrequests
 * are budgeted per invocation — so each run reads a slice and records where it
 * stopped. Without this, every run would re-read the same first page and the
 * long tail of the topic, which is where the small installable plugins live,
 * would never be indexed at all.
 */
export interface SweepCursor {
  /** The page a run should start from. 1 when nothing has been recorded. */
  read(): Promise<number>
  write(page: number): Promise<void>
}

/** Namespaced so the two indexers cannot collide on one key. */
export function sweepCursorKey(origin: string): string {
  return `crawler:${origin}:next-page`
}

export class KvSweepCursor implements SweepCursor {
  constructor(
    private readonly kv: KVNamespace,
    private readonly key: string,
  ) {}

  async read(): Promise<number> {
    const raw = await this.kv.get(this.key)
    const page = Number(raw)
    // An unset, corrupt or hand-edited key restarts the rotation rather than
    // failing the sweep: the crawl is idempotent, so page 1 is always safe.
    return Number.isInteger(page) && page > 0 ? page : 1
  }

  async write(page: number): Promise<void> {
    await this.kv.put(this.key, String(page))
  }
}
