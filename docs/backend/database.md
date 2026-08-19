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
