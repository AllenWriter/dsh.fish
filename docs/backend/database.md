# Database

This document describes database conventions. Fill in concrete technology choices in [`docs/project/architecture.md`](../project/architecture.md).

## Technology placeholders

- Database: `__DATABASE__`
- Migration tool: `__MIGRATION_TOOL__`
- ORM / query builder: `__ORM__`

## ID strategy

- Use UUIDs or ULIDs for primary identifiers by default.
- Do not expose auto-increment database IDs to clients.
- Use domain-specific value objects for IDs (e.g., `OrderId`) instead of raw strings.

## Schema rules

- One table per aggregate root.
- Keep tables normalized until read performance justifies denormalization.
- Document any intentional denormalization in [`docs/decisions/`](../decisions/README.md).
- Use explicit foreign keys and constraints at the database level.

### Catalog columns

- `artifacts.popularity` (real, migration `0008_artifact_popularity`) —
  materialized `listRank` for listing sorts. Written on catalog save, metrics
  snapshot, and install increment so `ORDER BY popularity` is a column scan
  (the same pattern as `star_velocity_*`). Indexes: `(deprecated, popularity)`
  for `/browse`, `(kind, deprecated, popularity)` for `/kind/:kind`, and
  `(deprecated, star_velocity_7d, popularity)` for `sort=rising`. List and
  snapshot reads omit `readme_markdown`; detail reads still load it.
- `artifacts.source_commit_sha` (nullable text, migration
  `0004_artifact_source_commit_sha`) — the default-branch HEAD the GitHub
  indexer scanned. It denormalizes `source.commit` out of the JSON `SourceRef`
  so scan provenance is a queryable column; both are written from the same
  resolved ref whenever a sweep rewrites the row, and the detail DTO / install
  plan read the column, not the JSON. A sweep that re-finds the stored row
  unchanged writes nothing: content moves go through the full catalog write,
  stats-only moves go through the metrics snapshot alone.
- `artifact_readme_translations` (migration `0005_minor_ultimo`) — one row per
  artifact and locale with a SHA-256 of the upstream README plus translation
  policy version, lifecycle status,
  generated Markdown, bounded error text and update timestamp. The composite
  primary key makes repeated ingestion idempotent; the source hash prevents a
  completed translation from surviving an upstream README or model-policy
  change.
- `artifact_summary_translations` (migration `0007_bouncy_leper_queen`) — the
  same contract for the short description: one row per artifact and locale,
  hash-pinned to the upstream summary. Listings override the DTO summary with
  the completed, hash-current row for the request locale.
- `artifact_reviews` (migration `0006_lucky_firestar`) — one row per
  (artifact, account) community rating: whole stars 1–5 plus an optional
  comment. The composite primary key is what makes re-rating an overwrite
  rather than a second vote. `author_name` / `author_avatar_url` are snapshots
  taken at rating time, deliberately not a join back to Better Auth's `users`:
  a review is a public statement that should survive an account rename or
  deletion unchanged, and the catalog's read path stays decoupled from
  identity storage (the same rule `artifacts.owner_account_id` follows).
  `account_id` itself is not a foreign key for the same reason.

## Migrations

- Store migrations in a dedicated directory (e.g., `infrastructure/persistence/migrations`).
- Migrations must be reversible when possible.
- Never modify an already-applied migration. Add a new migration to fix a mistake.
- Run migrations automatically in CI and on deployment, but backup production data first.

## Query conventions

- Keep query logic in repository implementations.
- Do not write raw SQL in application services or controllers.
- Use indexes for columns that are frequently filtered or sorted.
- Document slow queries and optimization decisions.

## Mapping

- Map between persistence models and domain entities in the repository.
- Do not let ORM annotations pollute domain entities.
