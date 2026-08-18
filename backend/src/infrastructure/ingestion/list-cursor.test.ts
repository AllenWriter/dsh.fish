import { describe, expect, it } from 'vitest'
import type { KVNamespace } from '@cloudflare/workers-types'
import { KvListCursor, listCursorKey } from './list-cursor.js'
import type { ListPosition } from './list-cursor.js'

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

const POSITION: ListPosition = { list: 1, offset: 37 }

describe('KvListCursor', () => {
  it('round-trips a position', async () => {
    const { kv, puts } = kvWith(null)
    const cursor = new KvListCursor(kv, listCursorKey('awesome-list'))

    await cursor.write(POSITION)

    expect(JSON.parse(puts[0] ?? '')).toEqual(POSITION)
    const stored = kvWith(JSON.stringify(POSITION))
    expect(await new KvListCursor(stored.kv, 'k').read()).toEqual(POSITION)
  })

  it('reads nothing when the key is unset', async () => {
    const { kv } = kvWith(null)
    expect(await new KvListCursor(kv, 'k').read()).toBeUndefined()
  })

  it('restarts rather than failing on a corrupt or stale-shape key', async () => {
    for (const garbage of [
      'not json',
      '{"list":"0","offset":4}',
      '{"list":-1,"offset":0}',
      '{"list":0,"offset":1.5}',
      '[]',
    ]) {
      const { kv } = kvWith(garbage)
      expect(await new KvListCursor(kv, 'k').read()).toBeUndefined()
    }
  })

  it('keeps its own keyspace apart from the shard cursor', () => {
    expect(listCursorKey('awesome-list')).not.toBe(listCursorKey('github'))
  })
})
