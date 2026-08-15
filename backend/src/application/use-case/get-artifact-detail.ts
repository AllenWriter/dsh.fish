import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { DomainError } from '../../domain/shared/error.js'
import { slug } from '../../domain/shared/slug.js'
import type { ArtifactDetailDto } from '../dto/artifact-dto.js'
import { toDetailDto } from '../dto/artifact-dto.js'

export class GetArtifactDetail {
  constructor(private readonly artifacts: ArtifactRepository) {}

  async execute(artifactId: string): Promise<ArtifactDetailDto> {
    const artifact = await this.artifacts.findById(slug(artifactId))
    if (!artifact) {
      throw DomainError.notFound('No such artifact.', { artifactId })
    }
    return toDetailDto(artifact)
  }
}
