import { describe, expect, it } from 'vitest'
import { openApiDocument } from './openapi'

describe('openApiDocument', () => {
  const document = openApiDocument('https://dsh.fish')

  it('declares OpenAPI 3.1 against the production origin', () => {
    expect(document.openapi).toBe('3.1.0')
    expect(document.servers).toEqual([{ url: 'https://dsh.fish' }])
  })

  it('documents exactly the anonymous read surface', () => {
    expect(Object.keys(document.paths).sort()).toEqual([
      '/api/health',
      '/api/v1/artifacts',
      '/api/v1/artifacts/{id}',
      '/api/v1/artifacts/{id}/install-plan',
      '/api/v1/artifacts/{id}/reviews',
      '/api/v1/catalog/snapshot',
      '/api/v1/catalog/version',
      '/api/v1/facets',
      '/api/v1/scoring',
    ])
  })

  it('matches the search parameters the router actually parses', () => {
    const parameters = document.paths['/api/v1/artifacts'].get.parameters.map(
      (parameter) => parameter.name,
    )
    expect(parameters).toEqual(['q', 'kind', 'category', 'sort', 'verified', 'limit', 'offset'])
  })

  it('documents the snapshot ETag contract', () => {
    const get = document.paths['/api/v1/catalog/snapshot'].get
    expect(get.responses['304']).toBeDefined()
    expect(get.responses['200'].headers?.ETag).toBeDefined()
  })
})
