import { describe, expect, it } from 'vitest'
import { ARTIFACT_KINDS, ARTIFACT_KIND_META } from '@dsh-fish/backend/domain/artifact/artifact-kind.js'
import { CATEGORIES } from '@dsh-fish/backend/domain/artifact/category.js'
import { Artifact } from '@dsh-fish/backend/domain/artifact/artifact.js'
import { buildInstallPlan, installTarget } from '@dsh-fish/backend/domain/artifact/install-plan.js'
import { githubSource, npmSource } from '@dsh-fish/backend/domain/artifact/source-ref.js'
import { messages, t } from './messages'

/**
 * Contract test between the layers.
 *
 * The backend deliberately emits message *keys*, never prose, so the catalog
 * stays language-neutral in the database. That only works if every key the
 * backend can emit has a translation here — otherwise the UI renders a raw
 * key like `install.warning.buildAllowance` to a user. These tests enumerate
 * the emittable keys from the backend itself rather than restating them, so a
 * newly added kind, category or warning fails here instead of in production.
 */

function has(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(messages, key)
}

describe('message coverage', () => {
  it('translates every artifact kind label and description', () => {
    for (const kind of ARTIFACT_KINDS) {
      const meta = ARTIFACT_KIND_META[kind]
      expect(has(meta.labelKey), `missing ${meta.labelKey}`).toBe(true)
      expect(has(meta.descriptionKey), `missing ${meta.descriptionKey}`).toBe(true)
    }
  })

  it('translates every category label', () => {
    for (const category of CATEGORIES) {
      expect(has(category.labelKey), `missing ${category.labelKey}`).toBe(true)
    }
  })

  it('translates every install warning the domain can raise', () => {
    // Each case is chosen to trigger a distinct warning branch.
    const target = installTarget('web')
    const plans = [
      // Build allowance + unpinned git spec.
      buildInstallPlan(
        Artifact.create({
          id: 'git-bundle',
          kind: 'bundle',
          displayName: 'Git bundle',
          summary: 'Installed from git.',
          source: githubSource({ owner: 'acme', repo: 'thing' }),
          payload: { kind: 'bundle', requiresBuild: true },
        }),
        target,
      ),
      // Profile ordering.
      buildInstallPlan(
        Artifact.create({
          id: 'a-profile',
          kind: 'profile',
          displayName: 'Profile',
          summary: 'A stack.',
          source: npmSource('dsh-profile', '1.0.0'),
          payload: { kind: 'profile', bundles: ['@deepseek-ai/dsh-base'] },
        }),
        target,
      ),
      // Credentials.
      buildInstallPlan(
        Artifact.create({
          id: 'a-server',
          kind: 'mcp-server',
          displayName: 'Server',
          summary: 'An MCP server.',
          source: npmSource('dsh-server', '1.0.0'),
          payload: {
            kind: 'mcp-server',
            serverName: 'demo',
            transport: 'stdio',
            command: 'npx',
            credentials: [{ envName: 'DEMO_TOKEN', required: true }],
          },
        }),
        target,
      ),
      // Hook bridge.
      buildInstallPlan(
        Artifact.create({
          id: 'a-hook',
          kind: 'hook-bridge',
          displayName: 'Hooks',
          summary: 'A bridge.',
          source: npmSource('dsh-hooks', '1.0.0'),
          payload: {
            kind: 'hook-bridge',
            dialect: 'claude-code',
            settingsPath: '~/.claude/settings.json',
          },
        }),
        target,
      ),
    ]

    const emitted = new Set(plans.flatMap((plan) => plan.warningKeys))
    expect(emitted.size).toBeGreaterThan(0)
    for (const key of emitted) {
      expect(has(key), `missing ${key}`).toBe(true)
    }
  })

  it('returns the key itself for an unknown key, so a gap is loud', () => {
    expect(t('does.not.exist')).toBe('does.not.exist')
  })
})
