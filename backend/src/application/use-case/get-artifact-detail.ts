import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import type { ReadmeTranslationRepository } from '../../domain/artifact/readme-translation.js'
import type { SummaryTranslationRepository } from '../../domain/artifact/summary-translation.js'
import { DomainError } from '../../domain/shared/error.js'
import { slug } from '../../domain/shared/slug.js'
import type { ArtifactDetailDto } from '../dto/artifact-dto.js'
import { toDetailDto } from '../dto/artifact-dto.js'
import { translatedReadme, translatedSummary } from '../lib/localized-prose.js'

export class GetArtifactDetail {
  constructor(
    private readonly artifacts: ArtifactRepository,
    private readonly readmeTranslations: ReadmeTranslationRepository,
    private readonly summaryTranslations: SummaryTranslationRepository,
    private readonly askEnabled = false,
  ) {}

  async execute(artifactId: string, locale?: string): Promise<ArtifactDetailDto> {
    const artifact = await this.artifacts.findById(slug(artifactId))
    if (!artifact) {
      throw DomainError.notFound('No such artifact.', { artifactId })
    }

    const availability = (await this.artifacts.listAvailableLocales?.(artifact.id)) ?? []
    const availableLocales = ['en', ...availability.map((entry) => entry.locale)].filter(
      (value, index, list) => list.indexOf(value) === index,
    )

    if (locale === undefined)
      return toDetailDto(artifact, undefined, undefined, this.askEnabled, availableLocales)

    const [translation, summaryTranslation] = await Promise.all([
      this.readmeTranslations.find(artifact.id, locale),
      this.summaryTranslations.find(artifact.id, locale),
    ])

    return toDetailDto(
      artifact,
      translatedReadme(translation),
      translatedSummary(summaryTranslation),
      this.askEnabled,
      availableLocales,
    )
  }
}
