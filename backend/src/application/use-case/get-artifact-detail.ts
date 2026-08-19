import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import type { ReadmeTranslationRepository } from '../../domain/artifact/readme-translation.js'
import { DomainError } from '../../domain/shared/error.js'
import { slug } from '../../domain/shared/slug.js'
import type { ArtifactDetailDto } from '../dto/artifact-dto.js'
import { toDetailDto } from '../dto/artifact-dto.js'
import { readmeDigest } from '../lib/readme-digest.js'

export class GetArtifactDetail {
  constructor(
    private readonly artifacts: ArtifactRepository,
    private readonly readmeTranslations: ReadmeTranslationRepository,
  ) {}

  async execute(artifactId: string, locale?: string): Promise<ArtifactDetailDto> {
    const artifact = await this.artifacts.findById(slug(artifactId))
    if (!artifact) {
      throw DomainError.notFound('No such artifact.', { artifactId })
    }
    const source = artifact.readmeMarkdown
    if (locale === undefined || source === undefined || source.trim() === '') {
      return toDetailDto(artifact)
    }

    const translation = await this.readmeTranslations.find(artifact.id, locale)
    const sourceHash = await readmeDigest(source)
    const localized =
      translation?.status === 'completed' &&
      translation.sourceHash === sourceHash &&
      translation.markdown !== undefined
        ? { markdown: translation.markdown, locale: translation.locale }
        : undefined
    return toDetailDto(artifact, localized)
  }
}
