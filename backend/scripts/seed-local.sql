-- Local development seed.
--
-- One artifact per kind, so every `buildInstallPlan` branch and every filter
-- facet can be exercised in a browser without waiting for a crawl. Applied
-- with: pnpm run db:seed:local
--
-- Not used in production: the real catalog is populated by the Cron Trigger.

DELETE FROM artifact_categories;
DELETE FROM artifact_search;
DELETE FROM artifacts;

INSERT INTO artifacts (
  id, kind, display_name, summary, source, source_origin, payload,
  keywords, categories, license, author_name, author_url, readme_markdown,
  stars, downloads, installs, owner_account_id, deprecated,
  published_at, updated_at, indexed_at
) VALUES
(
  'dsh-turtle-ui', 'bundle', '@turtle/dsh-turtle-ui',
  'A terminal UI surface for the harness, with a resizable transcript pane and inline diffs.',
  '{"origin":"npm","packageName":"@turtle/dsh-turtle-ui","latestVersion":"0.4.2"}', 'npm',
  '{"kind":"bundle","patchPath":"./cordis.patch.yml","requiresBuild":false}',
  '["tui","terminal","interface"]', '["ui","productivity"]', 'MIT',
  'turtle', 'https://github.com/deepseek-harness',
  '# turtle-ui' || char(10) || char(10) || 'A terminal surface for DeepSeek Harness.' || char(10) || char(10) || '## Install' || char(10) || char(10) || '```sh' || char(10) || 'dsh plugin --profile tui add @turtle/dsh-turtle-ui' || char(10) || '```',
  412, 2840, 96, 'seed-account', 0,
  1754006400000, 1754697600000, 1754697600000
),
(
  'dsh-postgres-mcp', 'mcp-server', 'Postgres MCP',
  'Query and inspect PostgreSQL databases as native agent tools, with read-only mode by default.',
  '{"origin":"github","owner":"acme","repo":"postgres-mcp","commit":"9f3c1ab7d2e45b6c8f01a2b3c4d5e6f708192a3b"}', 'github',
  '{"kind":"mcp-server","serverName":"postgres","transport":"stdio","command":"npx","args":["-y","@acme/postgres-mcp"],"credentials":[{"envName":"DATABASE_URL","required":true}]}',
  '["postgres","sql","database"]', '["data"]', 'Apache-2.0',
  'acme', 'https://github.com/acme',
  '# Postgres MCP' || char(10) || char(10) || 'Exposes schema inspection and parameterised queries.',
  1290, 0, 231, NULL, 0,
  1753488000000, 1754784000000, 1754784000000
),
(
  'acme-release-notes', 'skill', 'release-notes',
  'Draft release notes from a commit range, grouped by change type and written in the project voice.',
  '{"origin":"github","owner":"acme","repo":"release-notes-skill","commit":"1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d"}', 'github',
  '{"kind":"skill","skillName":"release-notes","layout":"directory","files":[{"path":"SKILL.md","downloadUrl":"https://raw.githubusercontent.com/acme/release-notes-skill/HEAD/SKILL.md"}]}',
  '["changelog","git","writing"]', '["productivity","coding"]', 'MIT',
  'acme', 'https://github.com/acme',
  '# release-notes' || char(10) || char(10) || 'Reads a commit range and drafts notes.',
  88, 0, 54, NULL, 0,
  1754179200000, 1754870400000, 1754870400000
),
(
  'reviewer-preset', 'agent-preset', 'reviewer',
  'A review-focused agent: read-only tools, a diff-first prompt, and no shell access.',
  '{"origin":"github","owner":"stvlynn","repo":"reviewer-preset","commit":"abc1234def5678901234567890abcdef12345678"}', 'github',
  '{"kind":"agent-preset","presetId":"reviewer","compositionUrl":"https://raw.githubusercontent.com/stvlynn/reviewer-preset/HEAD/agent.cordis.yml"}',
  '["review","code-quality"]', '["coding","testing"]', 'MIT',
  'stvlynn', 'https://github.com/stvlynn',
  '# reviewer' || char(10) || char(10) || 'A preset that reviews rather than edits.',
  37, 0, 12, 'seed-account', 0,
  1754265600000, 1754611200000, 1754611200000
),
(
  'claude-code-hooks', 'hook-bridge', 'Claude Code hooks',
  'Run your existing Claude Code shell hooks on harness lifecycle events, unchanged.',
  '{"origin":"npm","packageName":"dsh-claude-code-hooks","latestVersion":"0.2.0"}', 'npm',
  '{"kind":"hook-bridge","dialect":"claude-code","settingsPath":"~/.claude/settings.json"}',
  '["hooks","lifecycle","claude-code"]', '["devops"]', 'MIT',
  'community', NULL,
  '# claude-code-hooks' || char(10) || char(10) || 'Bridges the Claude Code hook protocol.',
  64, 910, 41, NULL, 0,
  1753574400000, 1754524800000, 1754524800000
),
(
  'dsh-review-stack', 'profile', 'review-stack',
  'A ready-made review setup: base harness, the reviewer preset and read-only shell policy.',
  '{"origin":"npm","packageName":"dsh-review-stack","latestVersion":"1.1.0"}', 'npm',
  '{"kind":"profile","bundles":["@deepseek-ai/dsh-base","dsh-reviewer-preset","dsh-readonly-shell"]}',
  '["starter","review"]', '["coding"]', 'MIT',
  'stvlynn', 'https://github.com/stvlynn',
  '# review-stack' || char(10) || char(10) || 'Everything needed to review a branch.',
  21, 340, 8, NULL, 0,
  1754352000000, 1754438400000, 1754438400000
),
(
  'dsh-legacy-shim', 'bundle', 'dsh-legacy-shim',
  'Compatibility shim for pre-release plugin APIs. Superseded by the built-in loader.',
  '{"origin":"npm","packageName":"dsh-legacy-shim","latestVersion":"0.0.9"}', 'npm',
  '{"kind":"bundle","requiresBuild":false}',
  '["compat","legacy"]', '["other"]', 'MIT',
  'community', NULL, NULL,
  4, 22, 1, NULL, 1,
  1750896000000, 1752192000000, 1752192000000
);

INSERT INTO artifact_search (artifact_id, haystack)
SELECT id, lower(display_name || ' ' || summary) FROM artifacts;

-- GitHub Social previews. The turtle-ui row uses a real uploaded preview so
-- local screenshots exercise the custom-image path; GitHub-sourced rows use
-- the generated Open Graph card for that owner/repo.
UPDATE artifacts SET og_image_url = 'https://repository-images.githubusercontent.com/70107786/4602445c-10a2-4903-a360-c96d70531f67'
  WHERE id = 'dsh-turtle-ui';
UPDATE artifacts SET og_image_url = 'https://opengraph.githubassets.com/preview/acme/postgres-mcp'
  WHERE id = 'dsh-postgres-mcp';
UPDATE artifacts SET og_image_url = 'https://opengraph.githubassets.com/preview/acme/release-notes-skill'
  WHERE id = 'acme-release-notes';
UPDATE artifacts SET og_image_url = 'https://opengraph.githubassets.com/preview/stvlynn/reviewer-preset'
  WHERE id = 'reviewer-preset';

INSERT INTO artifact_categories (artifact_id, category_id) VALUES
  ('dsh-turtle-ui', 'ui'),
  ('dsh-turtle-ui', 'productivity'),
  ('dsh-postgres-mcp', 'data'),
  ('acme-release-notes', 'productivity'),
  ('acme-release-notes', 'coding'),
  ('reviewer-preset', 'coding'),
  ('reviewer-preset', 'testing'),
  ('claude-code-hooks', 'devops'),
  ('dsh-review-stack', 'coding'),
  ('dsh-legacy-shim', 'other');
