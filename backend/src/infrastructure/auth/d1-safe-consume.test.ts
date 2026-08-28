import { describe, expect, it, vi } from 'vitest'
import { d1SafeConsumeOne, type ConsumableAdapter } from './d1-safe-consume.js'

function wrapped(database: unknown): ConsumableAdapter {
  return d1SafeConsumeOne(database) as ConsumableAdapter
}

describe('d1SafeConsumeOne', () => {
  it('redeems a matching row by id instead of a same-table DELETE subquery', async () => {
    const row = { id: 'dc-1', deviceCode: 'secret', status: 'approved', userId: 'user-1' }
    const findOne = vi.fn(async () => row)
    const del = vi.fn(async () => undefined)
    const adapter = wrapped({
      findOne,
      delete: del,
      consumeOne: async () => {
        throw new Error('driver consumeOne must not run on D1')
      },
    })

    await expect(
      adapter.consumeOne({
        model: 'deviceCode',
        where: [
          { field: 'deviceCode', value: 'secret' },
          { field: 'status', value: 'approved' },
        ],
      }),
    ).resolves.toEqual(row)

    expect(findOne).toHaveBeenCalledOnce()
    expect(del).toHaveBeenCalledWith({
      model: 'deviceCode',
      where: [{ field: 'id', value: 'dc-1' }],
    })
  })

  it('returns null when no row matches, and does not delete', async () => {
    const del = vi.fn(async () => undefined)
    const adapter = wrapped({
      findOne: async () => null,
      delete: del,
    })

    await expect(
      adapter.consumeOne({
        model: 'deviceCode',
        where: [{ field: 'deviceCode', value: 'missing' }],
      }),
    ).resolves.toBeNull()
    expect(del).not.toHaveBeenCalled()
  })

  it('wraps an adapter factory so Better Auth still receives a factory', async () => {
    const inner = {
      findOne: async () => ({ id: 'dc-2', userId: 'user-2' }),
      delete: vi.fn(async () => undefined),
    }
    const factory = d1SafeConsumeOne(() => inner) as () => ConsumableAdapter
    const adapter = factory()

    await expect(
      adapter.consumeOne({
        model: 'deviceCode',
        where: [{ field: 'status', value: 'approved' }],
      }),
    ).resolves.toMatchObject({ id: 'dc-2' })
    expect(inner.delete).toHaveBeenCalledWith({
      model: 'deviceCode',
      where: [{ field: 'id', value: 'dc-2' }],
    })
  })
})
