import { describe, expect, it } from 'vitest'
import type { KVNamespace } from '@cloudflare/workers-types'
import { KvSweepCursor, sweepCursorKey } from './sweep-cursor.js'
import type { SweepPosition } from './sweep-cursor.js'

function kvWith(stored: string | null) {
  const puts: string[] = []
  const kv = {
    get: async () => stored,
    put: async (_key: string, value: string) => {
      puts.push(value)
    },
  } as unknown as KVNamespace
  return { kv, puts }
}

const POSITION: SweepPosition = {
  shards: [
    { min: 0, max: 0, created: { from: '2008-01-01', to: '2017-06-01' } },
    { min: 0, max: 0, created: { from: '2017-06-02' } },
    { min: 1, max: 1 },
    { min: 1001 },
  ],
  index: 1,
  page: 4,
}

describe('KvSweepCursor', () => {
  it('round-trips a position', async () => {
    const { kv, puts } = kvWith(null)
    const cursor = new KvSweepCursor(kv, sweepCursorKey('github'))

    await cursor.write(POSITION)

    expect(JSON.parse(puts[0] ?? '')).toEqual(POSITION)
    const stored = kvWith(JSON.stringify(POSITION))
    expect(await new KvSweepCursor(stored.kv, 'k').read()).toEqual(POSITION)
  })

  it('reads nothing when the key is unset', async () => {
    const { kv } = kvWith(null)
    expect(await new KvSweepCursor(kv, 'k').read()).toBeUndefined()
  })

  it('discards the legacy page-number cursor', async () => {
    // The pre-sharding cursor was a bare page number; treating it as a
    // position would corrupt the plan, so the sweep simply starts over.
    const { kv } = kvWith('7')
    expect(await new KvSweepCursor(kv, 'k').read()).toBeUndefined()
  })

  it('discards a corrupt value rather than failing the sweep', async () => {
    const { kv } = kvWith('{not json')
    expect(await new KvSweepCursor(kv, 'k').read()).toBeUndefined()
  })

  it('discards a position whose shards are not ranges', async () => {
    const { kv } = kvWith(JSON.stringify({ shards: [{ min: 'zero' }], index: 0, page: 1 }))
    expect(await new KvSweepCursor(kv, 'k').read()).toBeUndefined()
  })

  it('clamps a shard index past the end of the plan', async () => {
    const { kv } = kvWith(JSON.stringify({ ...POSITION, index: 99 }))
    expect(await new KvSweepCursor(kv, 'k').read()).toEqual({ ...POSITION, index: 3 })
  })
})
