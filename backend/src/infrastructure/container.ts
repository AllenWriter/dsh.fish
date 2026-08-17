import { drizzle } from 'drizzle-orm/d1'
import type { IncomingRequestCfProperties } from '@cloudflare/workers-types'
import { GetArtifactDetail } from '../application/use-case/get-artifact-detail.js'
import { IngestCatalog } from '../application/use-case/ingest-catalog.js'
import { ListCatalogFacets } from '../application/use-case/list-catalog-facets.js'
import { ListSitemapEntries } from '../application/use-case/list-sitemap-entries.js'
import { ResolveInstallPlan } from '../application/use-case/resolve-install-plan.js'
import { SearchArtifacts } from '../application/use-case/search-artifacts.js'
import { SubmitArtifact } from '../application/use-case/submit-artifact.js'
import type { IdGenerator, SourceIndexer } from '../application/port/source-indexer.js'
import type { ArtifactRepository } from '../domain/artifact/artifact-repository.js'
import type { SubmissionRepository } from '../domain/submission/submission.js'
import { readConfig } from './config/env.js'
import type { HubConfig, HubEnv } from './config/env.js'
import { createAuth } from './auth/auth.js'
import type { HubAuth } from './auth/auth.js'
import { GitHubIndexer } from './ingestion/github-indexer.js'
import { NpmIndexer } from './ingestion/npm-indexer.js'
import { KvSweepCursor, sweepCursorKey } from './ingestion/sweep-cursor.js'
import { D1ArtifactRepository } from './persistence/d1-artifact-repository.js'
import { D1LinkedIdentityReader } from './persistence/d1-linked-identity.js'
import { D1SubmissionRepository } from './persistence/d1-submission-repository.js'
import * as schema from './persistence/schema.js'

export interface Container {
  readonly config: HubConfig
  readonly auth: HubAuth
  readonly artifacts: ArtifactRepository
  readonly submissions: SubmissionRepository
  readonly useCases: {
    readonly searchArtifacts: SearchArtifacts
    readonly getArtifactDetail: GetArtifactDetail
    readonly listCatalogFacets: ListCatalogFacets
    readonly listSitemapEntries: ListSitemapEntries
    readonly resolveInstallPlan: ResolveInstallPlan
    readonly submitArtifact: SubmitArtifact
    readonly ingestCatalog: IngestCatalog
  }
}

const ids: IdGenerator = { next: () => crypto.randomUUID() }

/**
 * Composition root.
 *
 * A Worker isolate handles many requests, but D1 and KV bindings arrive per
 * request, so the container is built per request rather than cached at module
 * scope. Everything it builds is cheap: no connection pools, no warm-up.
 */
export function createContainer(env: HubEnv, cf?: IncomingRequestCfProperties): Container {
  const config = readConfig(env)
  const db = drizzle(env.DB, { schema })

  const artifacts = new D1ArtifactRepository(db)
  const submissions = new D1SubmissionRepository(db)
  const identities = new D1LinkedIdentityReader(db)
  const indexers: readonly SourceIndexer[] = [
    new GitHubIndexer(config.githubToken, new KvSweepCursor(env.KV, sweepCursorKey('github'))),
    new NpmIndexer(),
  ]

  return {
    config,
    auth: createAuth(env, cf, config.baseUrl),
    artifacts,
    submissions,
    useCases: {
      searchArtifacts: new SearchArtifacts(artifacts),
      getArtifactDetail: new GetArtifactDetail(artifacts),
      listCatalogFacets: new ListCatalogFacets(artifacts),
      listSitemapEntries: new ListSitemapEntries(artifacts),
      resolveInstallPlan: new ResolveInstallPlan(artifacts),
      submitArtifact: new SubmitArtifact(submissions, artifacts, indexers, ids, identities),
      ingestCatalog: new IngestCatalog(artifacts, indexers),
    },
  }
}
