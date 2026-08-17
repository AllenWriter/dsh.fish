import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Catalog tables. Better Auth owns its own tables in `auth-schema.ts`; the two
 * meet only through `artifacts.ownerAccountId`, which references a Better Auth
 * user id but is deliberately not a foreign key — deleting an account must not
 * cascade away a public catalog row, it must only unclaim it.
 */
export const artifacts = sqliteTable(
  'artifacts',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    displayName: text('display_name').notNull(),
    summary: text('summary').notNull(),
    /** JSON-encoded `SourceRef`. */
    source: text('source', { mode: 'json' }).notNull(),
    sourceOrigin: text('source_origin').notNull(),
    /** JSON-encoded `ArtifactPayload`. */
    payload: text('payload', { mode: 'json' }).notNull(),
    keywords: text('keywords', { mode: 'json' }).notNull(),
    categories: text('categories', { mode: 'json' }).notNull(),
    license: text('license'),
    authorName: text('author_name'),
    authorUrl: text('author_url'),
    readmeMarkdown: text('readme_markdown'),
    /** GitHub Social preview URL; null when the source has none. */
    ogImageUrl: text('og_image_url'),
    stars: integer('stars').notNull().default(0),
    downloads: integer('downloads').notNull().default(0),
    installs: integer('installs').notNull().default(0),
    ownerAccountId: text('owner_account_id'),
    deprecated: integer('deprecated', { mode: 'boolean' }).notNull().default(false),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    indexedAt: integer('indexed_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('artifacts_kind_idx').on(table.kind),
    index('artifacts_origin_idx').on(table.sourceOrigin),
    index('artifacts_owner_idx').on(table.ownerAccountId),
    index('artifacts_updated_idx').on(table.updatedAt),
  ],
)

/**
 * Category membership, normalized so browsing by category is an index scan
 * rather than a JSON scan over every row.
 */
export const artifactCategories = sqliteTable(
  'artifact_categories',
  {
    artifactId: text('artifact_id')
      .notNull()
      .references(() => artifacts.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.artifactId, table.categoryId] }),
    index('artifact_categories_category_idx').on(table.categoryId),
  ],
)

export const submissions = sqliteTable(
  'submissions',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    kind: text('kind').notNull(),
    source: text('source', { mode: 'json' }).notNull(),
    /** Stable digest of the source, so a duplicate pending submission is one lookup. */
    sourceKey: text('source_key').notNull(),
    note: text('note'),
    status: text('status').notNull(),
    reviewerNote: text('reviewer_note'),
    artifactId: text('artifact_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    decidedAt: integer('decided_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('submissions_account_idx').on(table.accountId),
    index('submissions_status_idx').on(table.status),
    index('submissions_source_key_idx').on(table.sourceKey),
  ],
)

/**
 * Full-text index over the catalog.
 *
 * D1 is SQLite, so FTS5 is available and is what makes search a real ranked
 * query rather than a `LIKE '%…%'` scan. The table is kept in step by the
 * repository on every write; SQLite triggers would be tidier but D1 migrations
 * apply them inconsistently across local and remote, so the write path owns it.
 */
export const artifactSearch = sqliteTable('artifact_search', {
  artifactId: text('artifact_id').primaryKey(),
  /** Lowercased `displayName + summary + keywords`, searched with LIKE fallbacks. */
  haystack: text('haystack').notNull(),
})
