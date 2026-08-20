# Public API

Endpoints intended for third-party consumers — directories, bots, and other
registries — rather than for the site's own UI. All are anonymous, read-only,
and versioned under `/api/v1`. For envelopes, status codes, and general rules
see [`api-conventions.md`](api-conventions.md).

## Catalog snapshot

Third-party directories should not crawl the browse endpoints to mirror the
catalog. The snapshot endpoints expose the whole public catalog as one
versioned document with an ETag-based sync contract.

### `GET /api/v1/catalog/snapshot`

Returns every public (non-deprecated) artifact as one JSON document, ordered by
id so the bytes are canonical for a given catalog state.

```json
{
  "dataVersion": "9f2c…(64 hex chars)",
  "artifactCount": 1240,
  "generatedAt": "2026-08-01T12:00:00.000Z",
  "artifacts": [
    {
      "id": "dsh-hello-plugin",
      "kind": "bundle",
      "displayName": "dsh-hello-plugin",
      "summary": "A bundle.",
      "keywords": [],
      "categories": ["other"],
      "sourceOrigin": "npm",
      "sourceUrl": "https://www.npmjs.com/package/dsh-hello-plugin",
      "verified": false,
      "deprecated": false,
      "stats": { "stars": 0, "downloads": 0, "installs": 12 },
      "updatedAt": "2026-07-20T09:30:00.000Z"
    }
  ]
}
```

- `artifacts[]` uses the same summary serialization as `GET /api/v1/artifacts`.
- `dataVersion` is a SHA-256 hex digest derived from a D1 aggregate over the
  public catalog (count, newest `updatedAt`, total installs/stars/downloads).
  Any publicly visible change moves it; an unchanged catalog keeps it.
- `generatedAt` is the newest `updatedAt` in the catalog — the data's
  timestamp, not the render time.

Response headers:

- `ETag: "<dataVersion>"` — the data version, quoted per RFC 7232.
- `Cache-Control: public, max-age=300`.

### `GET /api/v1/catalog/version`

A cheap poll that never reads an artifact row:

```json
{
  "dataVersion": "9f2c…",
  "artifactCount": 1240,
  "generatedAt": "2026-08-01T12:00:00.000Z"
}
```

### Sync contract

1. Poll `GET /api/v1/catalog/version`. If `dataVersion` equals the version you
   already hold, stop — nothing changed.
2. Otherwise download `GET /api/v1/catalog/snapshot`. Store the body together
   with its `ETag`.
3. Later downloads may be conditional: send `If-None-Match: "<dataVersion>"`.
   An unchanged catalog answers `304 Not Modified` with an empty body.

The snapshot body is cached in KV under its data version, so repeat downloads
of an unchanged catalog do not rebuild the document.

```sh
# Cheap poll
curl -s https://dsh.fish/api/v1/catalog/version

# Conditional download
curl -s -H 'If-None-Match: "9f2c…"' -w '%{http_code}\n' \
  https://dsh.fish/api/v1/catalog/snapshot
```

## Community ratings

### `GET /api/v1/artifacts/:id/reviews`

The site's own 1–5 star rating system: the aggregate, the 5-to-1 distribution,
and the most recent reviews. Ratings are written from the dsh harness (the hub
plugin's `hub_rate` tool or `dsh-fish rate`), never from the web — this
endpoint is the anonymous read side the artifact pages are rendered from.

```json
{
  "artifactId": "dsh-postgres-mcp",
  "scale": { "min": 1, "max": 5 },
  "summary": {
    "average": 3.8,
    "count": 4,
    "distribution": [0, 1, 0, 2, 1]
  },
  "items": [
    {
      "author": { "name": "Ada" },
      "rating": 5,
      "comment": "Installed and queried a live database with it.",
      "createdAt": "2026-08-01T12:00:00.000Z",
      "updatedAt": "2026-08-01T12:00:00.000Z"
    }
  ]
}
```

- `scale` travels with the payload so a client never has to guess what a
  rating means on this site.
- `distribution[i]` is the count of (i+1)-star ratings; `average` is `null`
  while nobody has rated.
- One rating per account per artifact — re-rating overwrites, so `count` is
  always the number of distinct raters.
- `?limit=` caps the returned reviews (default 20, max 100), most recently
  written first. A review may be rating-only, with no `comment`.

The write side is `PUT /api/v1/artifacts/:id/reviews/mine` with a bearer token
from the device grant (session cookies work too). It accepts
`{ "rating": 1–5, "comment?": string ≤ 2000 }` and returns the same document
above, fresh after the write.
