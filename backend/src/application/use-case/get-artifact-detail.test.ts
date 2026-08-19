import { describe, expect, it } from 'vitest'
import { Artifact } from '../../domain/artifact/artifact.js'
import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import type {
  ReadmeTranslation,
  ReadmeTranslationRepository,
} from '../../domain/artifact/readme-translation.js'
import { npmSource } from '../../domain/artifact/source-ref.js'
import type { Slug } from '../../domain/shared/slug.js'
import { readmeDigest } from '../lib/readme-digest.js'
import { GetArtifactDetail } from './get-artifact-detail.js'

const artifact = Artifact.create({
  id: 'dsh-hello',
  kind: 'bundle',
  displayName: 'dsh-hello',
  summary: 'A bundle.',
  source: npmSource('dsh-hello', '1.0.0'),
  payload: { kind: 'bundle', requiresBuild: false },
  readmeMarkdown: '# Hello',
})

function artifactRepository(): ArtifactRepository {
  return {
    findById: async (id) => (id === artifact.id ? artifact : undefined),
    search: async () => {
      throw new Error('not used')
    },
    countByKind: async () => [],
    save: async () => {},
    saveMany: async () => {},
    incrementInstalls: async () => {},
    recordMetricsSnapshot: async () => {},
    listIdsByOrigin: async () => [],
    listForSitemap: async () => {
      throw new Error('not used')
    },
    listForSnapshot: async () => [],
    catalogStats: async () => ({
      artifactCount: 1,
      maxUpdatedAtMs: 0,
      installs: 0,
      stars: 0,
      downloads: 0,
    }),
  }
}

function translations(value?: ReadmeTranslation): ReadmeTranslationRepository {
  return {
    find: async (_artifactId: Slug, _locale: string) => value,
    save: async () => {},
  }
}

describe('GetArtifactDetail README localization', () => {
  it('returns the completed translation for the requested locale', async () => {
    const sourceHash = await readmeDigest(artifact.readmeMarkdown!)
    const useCase = new GetArtifactDetail(
      artifactRepository(),
      translations({
        artifactId: artifact.id,
        locale: 'zh-CN',
        sourceHash,
        status: 'completed',
        markdown: '# 你好',
        updatedAt: new Date(),
      }),
    )

    const detail = await useCase.execute(artifact.id, 'zh-CN')

    expect(detail).toMatchObject({
      readmeMarkdown: '# 你好',
      readmeLocale: 'zh-CN',
      readmeMachineTranslated: true,
    })
  })

  it('keeps the upstream README when the stored translation is stale', async () => {
    const useCase = new GetArtifactDetail(
      artifactRepository(),
      translations({
        artifactId: artifact.id,
        locale: 'zh-CN',
        sourceHash: 'stale',
        status: 'completed',
        markdown: '# 旧译文',
        updatedAt: new Date(),
      }),
    )

    const detail = await useCase.execute(artifact.id, 'zh-CN')

    expect(detail.readmeMarkdown).toBe('# Hello')
    expect(detail.readmeMachineTranslated).toBeUndefined()
  })
})
