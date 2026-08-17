import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchCatalog } from './search-catalog'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('searchCatalog', () => {
  it('queries the same catalog endpoint the browse page uses', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      expect(url).toBe('/api/v1/artifacts?q=postgres&limit=8')
      return Response.json({
        items: [{ id: 'dsh-postgres-mcp', displayName: 'Postgres MCP' }],
        total: 1,
        limit: 8,
        offset: 0,
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const items = await searchCatalog('postgres', new AbortController().signal)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(items).toEqual([{ id: 'dsh-postgres-mcp', displayName: 'Postgres MCP' }])
  })

  it('throws when the catalog cannot be read, rather than returning no hits', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    )

    await expect(searchCatalog('postgres', new AbortController().signal)).rejects.toThrow(
      'Catalog search failed (500)',
    )
  })
})
