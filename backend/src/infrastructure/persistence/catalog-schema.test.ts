import { describe, expect, it } from 'vitest'
import migrationSql from '../../../migrations/0004_artifact_source_commit_sha.sql?raw'
import readmeMigrationSql from '../../../migrations/0005_minor_ultimo.sql?raw'
import journal from '../../../migrations/meta/_journal.json'
import { artifactReadmeTranslations, artifacts } from './catalog-schema.js'

/**
 * The schema, the migration and the journal are written by hand and must
 * agree: a column the mapper writes but the migration never adds fails only
 * against a real database, which these tests do not stand up.
 */
describe('artifacts.sourceCommitSha', () => {
  it('maps to the nullable column the 0004 migration adds', () => {
    expect(artifacts.sourceCommitSha.name).toBe('source_commit_sha')
    expect(artifacts.sourceCommitSha.notNull).toBe(false)

    expect(migrationSql).toContain('ALTER TABLE `artifacts` ADD `source_commit_sha` text;')
    expect(journal.entries.map((entry) => entry.tag)).toContain('0004_artifact_source_commit_sha')
  })
})

describe('artifact README translations', () => {
  it('keeps the schema, migration and journal in step', () => {
    expect(artifactReadmeTranslations.sourceHash.name).toBe('source_hash')
    expect(artifactReadmeTranslations.markdown.notNull).toBe(false)
    expect(readmeMigrationSql).toContain('CREATE TABLE `artifact_readme_translations`')
    expect(readmeMigrationSql).not.toContain('CREATE TABLE `artifact_metrics`')
    expect(journal.entries.map((entry) => entry.tag)).toContain('0005_minor_ultimo')
  })
})
