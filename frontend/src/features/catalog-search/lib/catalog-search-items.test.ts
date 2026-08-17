import { describe, expect, it, vi } from 'vitest'
import { mockArtifact } from '@/entities/artifact/model/artifact.fixture'
import type { CommandItem } from '@/shared/ui/motion/command-palette'
import {
  artifactPath,
  browseSearchPath,
  catalogSearchItems,
} from './catalog-search-items'

const copy = {
  searchLabel: 'Search plugins',
  searchAllLabel: 'Search the catalog for “postgres”',
  errorLabel: 'Something went wrong.',
}

const commands: CommandItem[] = [
  { id: '/browse', label: 'Browse', onSelect: () => undefined },
]

describe('catalogSearchItems', () => {
  it('lists navigation when the query is empty', () => {
    const items = catalogSearchItems('', commands, [mockArtifact()], false, copy, vi.fn(), vi.fn())
    expect(items).toEqual(commands)
  })

  it('puts a catalog search row first so Enter searches plugins', () => {
    const onBrowse = vi.fn()
    const items = catalogSearchItems(
      'postgres',
      commands,
      [],
      false,
      copy,
      onBrowse,
      vi.fn(),
    )

    expect(items[0]?.id).toBe('browse-search')
    expect(items[0]?.label).toBe(copy.searchAllLabel)
    expect(items[0]?.keywords).toContain('postgres')
    items[0]?.onSelect()
    expect(onBrowse).toHaveBeenCalledWith('postgres')
  })

  it('offers each catalog hit as its own destination', () => {
    const onArtifact = vi.fn()
    const hit = mockArtifact({
      id: 'dsh-postgres-mcp',
      displayName: 'Postgres MCP',
      summary: 'Talk to Postgres.',
      keywords: ['sql'],
    })
    const items = catalogSearchItems(
      'postgres',
      commands,
      [hit],
      false,
      copy,
      vi.fn(),
      onArtifact,
    )

    expect(items.map((item) => item.id)).toEqual(['browse-search', 'artifact:dsh-postgres-mcp'])
    expect(items[1]?.label).toBe('Postgres MCP')
    expect(items[1]?.keywords).toEqual(
      expect.arrayContaining(['postgres', 'Talk to Postgres.', 'dsh-postgres-mcp', 'sql']),
    )
    items[1]?.onSelect()
    expect(onArtifact).toHaveBeenCalledWith('dsh-postgres-mcp')
  })

  it('reports a failed request instead of rendering it as no matches', () => {
    const onBrowse = vi.fn()
    const items = catalogSearchItems(
      'postgres',
      commands,
      [mockArtifact()],
      true,
      copy,
      onBrowse,
      vi.fn(),
    )

    expect(items.map((item) => item.id)).toEqual(['browse-search', 'search-error'])
    expect(items[1]?.label).toBe(copy.errorLabel)
    items[1]?.onSelect()
    expect(onBrowse).toHaveBeenCalledWith('postgres')
  })
})

describe('search destinations', () => {
  it('encodes the query on the browse URL', () => {
    expect(browseSearchPath('mcp server')).toBe('/browse?q=mcp%20server')
  })

  it('opens a hit on its artifact page', () => {
    expect(artifactPath('dsh-postgres-mcp')).toBe('/a/dsh-postgres-mcp')
  })
})
