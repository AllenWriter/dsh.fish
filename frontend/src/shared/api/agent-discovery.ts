/**
 * Agent-discovery `Link` headers (RFC 8288).
 *
 * Every HTML document carries pointers to the machine-readable doors into the
 * catalog, so an agent that lands on any page learns — without parsing the
 * markup — where the api-catalog, the OpenAPI description, the human docs and
 * the bulk snapshot are. RFC 9727 only asks for the api-catalog link on the
 * origin root; repeating the set on every page costs four headers and removes
 * the homepage as a single point of discovery.
 *
 * When the page also answers `Accept: text/markdown`, an `alternate` link says
 * so — the representation is negotiated on the same URL, so the href is the
 * page itself.
 */
const DISCOVERY_LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '</docs>; rel="service-doc"; type="text/html"',
  '</api/v1/catalog/snapshot>; rel="describedby"; type="application/json"',
] as const

export function withDiscoveryLinks(
  response: Response,
  requestUrl: string,
  hasMarkdownAlternate: boolean,
): Response {
  const contentType = response.headers.get('content-type') ?? ''
  if (response.status !== 200 || !contentType.startsWith('text/html')) return response

  const decorated = new Response(response.body, response)
  for (const link of DISCOVERY_LINKS) decorated.headers.append('Link', link)
  if (hasMarkdownAlternate) {
    const url = new URL(requestUrl)
    decorated.headers.append(
      'Link',
      `<${url.origin}${url.pathname}>; rel="alternate"; type="text/markdown"`,
    )
    decorated.headers.append('Vary', 'Accept')
  }
  return decorated
}
