import { describe, expect, it } from 'vitest'
import { HubError, type ArtifactSummary, type HubClient } from '@dsh-fish/hub/install'
import { artifactIdFromHubUrl, githubShorthand, resolveArtifact } from './resolve-source.js'

function summary(overrides: Partial<ArtifactSummary> = {}): ArtifactSummary {
  return {
    id: 'acme-notes',
    kind: 'skill',
    displayName: 'notes',
    summary: 'Take notes.',
    keywords: [],
    verified: false,
    deprecated: false,
    stats: { stars: 0, downloads: 0, installs: 0 },
    sourceUrl: 'https://github.com/acme/notes',
    ...overrides,
  }
}

describe('artifactIdFromHubUrl', () => {
  it('reads the id out of English and localized artifact URLs', () => {
    expect(artifactIdFromHubUrl('https://dsh.fish/a/release-notes')).toBe('release-notes')
    expect(artifactIdFromHubUrl('https://dsh.fish/zh-CN/a/release-notes')).toBe('release-notes')
    expect(artifactIdFromHubUrl('https://example.test/browse')).toBeUndefined()
  })
})

describe('githubShorthand', () => {
  it('accepts owner/repo, github: and github.com URLs', () => {
    expect(githubShorthand('acme/notes')).toEqual({ owner: 'acme', repo: 'notes' })
    expect(githubShorthand('github:acme/notes')).toEqual({ owner: 'acme', repo: 'notes' })
    expect(githubShorthand('https://github.com/acme/notes.git')).toEqual({
      owner: 'acme',
      repo: 'notes',
    })
  })
})

describe('resolveArtifact', () => {
  it('uses a hub URL without searching', async () => {
    const client = {
      detail: async (id: string) => summary({ id }),
      search: async () => ({ items: [], total: 0 }),
    } as unknown as HubClient
    await expect(
      resolveArtifact(client, 'https://dsh.fish/ja/a/acme-notes'),
    ).resolves.toMatchObject({ id: 'acme-notes' })
  })

  it('lists ids when a search is ambiguous rather than installing the first hit', async () => {
    const client = {
      detail: async () => {
        throw new HubError('No such artifact.', 'NOT_FOUND')
      },
      search: async () => ({
        items: [summary({ id: 'one' }), summary({ id: 'two', displayName: 'other' })],
        total: 2,
      }),
    } as unknown as HubClient
    await expect(resolveArtifact(client, 'notes')).rejects.toMatchObject({ code: 'AMBIGUOUS' })
  })

  it('picks the GitHub source match for owner/repo', async () => {
    const client = {
      detail: async () => {
        throw new HubError('No such artifact.', 'NOT_FOUND')
      },
      search: async () => ({
        items: [
          summary({ id: 'other', sourceUrl: 'https://github.com/other/notes' }),
          summary({ id: 'acme-notes' }),
        ],
        total: 2,
      }),
    } as unknown as HubClient
    await expect(resolveArtifact(client, 'acme/notes')).resolves.toMatchObject({ id: 'acme-notes' })
  })
})
