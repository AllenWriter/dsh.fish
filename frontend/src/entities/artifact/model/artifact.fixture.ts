import { ARTIFACT_KINDS, CATEGORIES, type Artifact, type ArtifactKind } from './types'

/**
 * Mock catalog rows, for tests only.
 *
 * Nothing in the app imports this file. It exists so a component test can render
 * every kind, every category and every optional field without a database, and so
 * the shape those tests render against is the backend's `ArtifactSummaryDto` — a
 * renamed field breaks the typecheck here exactly as it does in the components.
 */
export function mockArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: 'dsh-hello',
    kind: 'bundle',
    displayName: '@acme/dsh-hello',
    summary: 'A bundle.',
    keywords: [],
    categories: ['other'],
    sourceOrigin: 'github',
    sourceUrl: 'https://github.com/acme/dsh-hello',
    author: { name: 'acme' },
    verified: false,
    deprecated: false,
    stats: { stars: 1200, downloads: 0, installs: 0 },
    score: 80,
    grade: 'A',
    maintenanceStatus: 'active',
    starVelocity7d: 12,
    starVelocity30d: 40,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/** Every category id the taxonomy browses, as a catalog row would carry them. */
export const MOCK_CATEGORY_IDS: readonly string[] = CATEGORIES.map((entry) => entry.id as string)

/**
 * One row per kind, each carrying a different combination of the optional
 * facts — verified, deprecated, stars, downloads — so a single render walks
 * every branch a card or a chip has.
 */
export function mockCatalog(): readonly Artifact[] {
  return ARTIFACT_KINDS.map((kind: ArtifactKind, index) =>
    mockArtifact({
      id: `mock-${kind}`,
      kind,
      displayName: `mock ${kind}`,
      categories: [MOCK_CATEGORY_IDS[index % MOCK_CATEGORY_IDS.length] ?? 'other'],
      verified: index % 2 === 0,
      deprecated: index % 3 === 0,
      stats: { stars: index * 10, downloads: index * 100, installs: index },
    }),
  )
}
