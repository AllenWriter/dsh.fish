import type { ArtifactRepository } from '../../domain/artifact/artifact-repository.js'
import { buildInstallPlan, installTarget } from '../../domain/artifact/install-plan.js'
import { DomainError } from '../../domain/shared/error.js'
import { slug } from '../../domain/shared/slug.js'
import type { InstallPlanDto } from '../dto/artifact-dto.js'
import { toInstallPlanDto } from '../dto/artifact-dto.js'

export interface ResolveInstallPlanInput {
  readonly artifactId: string
  readonly profile?: string
  /**
   * Whether this resolution is an actual install rather than a preview. The
   * website previews plans on every detail page view; only the plugin's real
   * install increments the counter, so the number stays a install count and
   * not a page-view count.
   */
  readonly recordInstall?: boolean
}

const DEFAULT_PROFILE = 'web'

/**
 * Turn a catalog row into the steps that put it on a machine.
 *
 * Three surfaces call this: the site renders `manualCommands` for copy-paste,
 * and the `dsh-hub` plugin plus `@dsh-fish/cli` execute `steps`. One resolver
 * means the documented command and the automated install can never disagree.
 */
export class ResolveInstallPlan {
  constructor(private readonly artifacts: ArtifactRepository) {}

  async execute(input: ResolveInstallPlanInput): Promise<InstallPlanDto> {
    const id = slug(input.artifactId)
    const artifact = await this.artifacts.findById(id)
    if (!artifact) {
      throw DomainError.notFound('No such artifact.', { artifactId: input.artifactId })
    }
    if (artifact.deprecated) {
      // Deprecated rows stay resolvable — a pinned dependency may still need
      // them — but the caller is told so it can warn before running the plan.
      // Nothing here blocks the install.
    }

    const target = installTarget(input.profile ?? DEFAULT_PROFILE)
    const plan = buildInstallPlan(artifact, target)

    if (input.recordInstall === true) {
      await this.artifacts.incrementInstalls(id, 1)
    }

    return toInstallPlanDto(plan)
  }
}
