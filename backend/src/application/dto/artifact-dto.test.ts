import { describe, expect, it } from 'vitest'
import { Artifact } from '../../domain/artifact/artifact.js'
import { buildInstallPlan, installTarget } from '../../domain/artifact/install-plan.js'
import { githubSource, npmSource } from '../../domain/artifact/source-ref.js'
import { toDetailDto, toInstallPlanDto } from './artifact-dto.js'

const SHA = 'c0ffee'.padEnd(40, '0')

function artifact(sourceCommitSha?: string): Artifact {
  return Artifact.create({
    id: 'dsh-hello',
    kind: 'bundle',
    displayName: 'dsh-hello',
    summary: 'A bundle.',
    source:
      sourceCommitSha === undefined
        ? npmSource('dsh-hello', '1.0.0')
        : githubSource({ owner: 'acme', repo: 'hello', commit: sourceCommitSha }),
    payload: { kind: 'bundle', requiresBuild: false },
    ...(sourceCommitSha === undefined ? {} : { sourceCommitSha }),
  })
}

/**
 * The detail DTO is what the artifact page and API consumers read scan
 * provenance from; the install plan DTO is what the CLI prints. Both must
 * surface the pinned commit the indexer stored, and stay silent for sources
 * that have none.
 */
describe('scan provenance in DTOs', () => {
  it('exposes the scanned commit and its browsable URL on the detail DTO', () => {
    const dto = toDetailDto(artifact(SHA))

    expect(dto.sourceCommitSha).toBe(SHA)
    expect(dto.sourceCommitUrl).toBe(`https://github.com/acme/hello/commit/${SHA}`)
  })

  it('omits provenance for a source with no pinned commit', () => {
    const dto = toDetailDto(artifact())

    expect(dto.sourceCommitSha).toBeUndefined()
    expect(dto.sourceCommitUrl).toBeUndefined()
  })

  it('carries the scanned commit onto the install plan DTO', () => {
    const plan = buildInstallPlan(artifact(SHA), installTarget('web'))

    expect(toInstallPlanDto(plan).scannedAtCommit).toBe(SHA)
    expect(
      toInstallPlanDto(buildInstallPlan(artifact(), installTarget('web'))).scannedAtCommit,
    ).toBeUndefined()
  })
})

describe('ask availability on the detail DTO', () => {
  it('offers ask for a GitHub source when the flag is on', () => {
    expect(toDetailDto(artifact(SHA), undefined, undefined, true).ask).toEqual({
      available: true,
      repoName: 'acme/hello',
    })
  })

  it('hides ask when the flag is off, even for GitHub', () => {
    expect(toDetailDto(artifact(SHA)).ask).toEqual({ available: false, reason: 'disabled' })
  })

  it('hides ask for an npm source', () => {
    expect(toDetailDto(artifact(), undefined, undefined, true).ask).toEqual({
      available: false,
      reason: 'not_github',
    })
  })
})
