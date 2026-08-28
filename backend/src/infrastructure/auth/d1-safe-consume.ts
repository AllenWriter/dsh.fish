/**
 * D1 cannot run Better Auth's drizzle `consumeOne`: it issues
 * `DELETE FROM t WHERE id IN (SELECT id FROM t …)`, and SQLite refuses a
 * same-table subquery on DELETE (`table is locked`). UPDATE with the same
 * shape works, which is why claiming a device code succeeds and redeeming it
 * after Approve does not.
 *
 * Find-then-delete by primary key is two statements. D1 has no
 * cross-statement transaction, so two concurrent polls could both observe the
 * row; the second session is a duplicate for the same account, not a reuse of
 * a consumed grant. The plugin polls once per machine.
 */

type WhereClause = ReadonlyArray<{
  readonly field: string
  readonly value: unknown
  readonly operator?: string
}>

export interface ConsumableAdapter {
  findOne: (args: {
    model: string
    where: WhereClause
  }) => Promise<Record<string, unknown> | null>
  delete: (args: { model: string; where: WhereClause }) => Promise<unknown>
  consumeOne: (args: {
    model: string
    where: WhereClause
  }) => Promise<Record<string, unknown> | null>
}

function wrapAdapter(adapter: Omit<ConsumableAdapter, 'consumeOne'> & Partial<Pick<ConsumableAdapter, 'consumeOne'>>): ConsumableAdapter {
  return {
    ...adapter,
    async consumeOne({ model, where }) {
      const row = await adapter.findOne({ model, where })
      if (row === null) return null
      const id = row['id']
      if (typeof id !== 'string' || id === '') return null
      await adapter.delete({
        model,
        where: [{ field: 'id', value: id }],
      })
      return row
    },
  }
}

/**
 * Wrap a Better Auth `database` option (adapter instance or factory).
 *
 * Typed as `unknown` because `withCloudflare`'s return type omits `database`
 * even though the runtime object carries the drizzle adapter.
 */
export function d1SafeConsumeOne(database: unknown): unknown {
  if (typeof database === 'function') {
    return (...args: never[]) =>
      wrapAdapter((database as (...args: never[]) => Omit<ConsumableAdapter, 'consumeOne'>)(...args))
  }
  if (typeof database === 'object' && database !== null) {
    return wrapAdapter(database as Omit<ConsumableAdapter, 'consumeOne'>)
  }
  return database
}
