/**
 * A readme that stresses every construct the plugin page has to keep on a
 * phone-sized screen: a wide table, an unbroken command, a wide screenshot,
 * nested lists, GFM extras, and a token that would overflow if wrapping is off.
 *
 * Built as a factory so the e2e seed and the assertions share one source, and
 * so the catalogue seed used for local browsing is not this test document.
 */
export function kitchenSinkReadme(): string {
  return [
    '# Postgres MCP',
    '',
    'Exposes schema inspection and parameterised queries as native agent tools.',
    '',
    'Inline badges sit in a paragraph so they do not pick up the screenshot outline: ![ci](docs/ci.svg) ![npm](docs/npm.svg).',
    '',
    '![Architecture](docs/architecture.png)',
    '',
    '## Configuration',
    '',
    'See the [setup guide](docs/guide.md) for TLS and pool limits. A connection string must not blow the page sideways: `postgresql://readonly:super-secret-password@db.internal.example.com:5432/analytics?sslmode=require&application_name=dsh-postgres-mcp`.',
    '',
    '| Setting | Default | Staging | Production | Replica | Notes |',
    '| --- | --- | --- | --- | --- | --- |',
    '| Connection string | `postgres://localhost/app` | `postgres://staging.internal.example.com:5432/app` | `postgres://prod.internal.example.com:5432/app` | `postgres://replica.internal.example.com:5432/app` | Always DSN, never a URL-encoded blob |',
    '| SSL mode | disable | require | verify-full | require | Production verifies the CA |',
    '| Pool size | 4 | 8 | 32 | 16 | Per-worker, not per-machine |',
    '| Statement timeout | 2s | 5s | 15s | 15s | Cancels a runaway SELECT |',
    '',
    '## Install',
    '',
    '```sh',
    'npx -y @acme/postgres-mcp --connection-string postgresql://readonly:super-secret-password@db.internal.example.com:5432/analytics?sslmode=require&application_name=dsh-postgres-mcp-very-long-identifier',
    '```',
    '',
    '## What it can do',
    '',
    '- Inspect schemas',
    '  - List tables',
    '    - Including partitions',
    '  - List columns and types',
    '- Run parameterised queries',
    '  - Read-only by default',
    '',
    '- [x] Read-only mode on',
    '- [ ] Write tools gated',
    '',
    '> Do not point this at a primary unless the caller has a reason. A replica is the default.',
    '',
    '~~The old TCP port map is gone.~~ Use the DSN.',
    '',
    '---',
    '',
    '## What\'s next?',
    '',
    'Jump back to [Configuration](#configuration) after rotating credentials.',
    '',
    '<script>alert(1)</script>',
    '',
    '<div onclick="x()">boxed</div>',
  ].join('\n')
}

export const KITCHEN_SINK_ARTIFACT_ID = 'dsh-postgres-mcp'
