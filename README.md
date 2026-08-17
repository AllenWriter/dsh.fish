# dsh.fish

**Discover and install plugins for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).**

[Browse the plugin hub](https://dsh.fish) · [Explore the architecture](docs/project/architecture.md) · [Read the SEO design](docs/seo/README.md)

dsh.fish is the open-source plugin registry and installer for DeepSeek Harness.
Search bundles, profiles, skills, MCP servers, agent presets, and hook bridges;
inspect how each artifact changes a harness profile; then install it from the
web or directly through an AI agent.

DeepSeek Harness is built on “everything is a plugin” but ships no registry.
Its README asks authors to tag repositories with the `dsh-plugin` topic and
leaves discovery there. dsh.fish turns that topic into a searchable,
multilingual catalog with a shared, machine-executable install plan.

## Quick start

Browse the catalog at **[dsh.fish](https://dsh.fish)**, or add the hub plugin to
your `web` profile:

```sh
dsh plugin --profile web add github:stvlynn/dsh.fish#main
```

The plugin registers `hub_search`, `hub_show`, `hub_install`, and `hub_account`,
so an agent can discover and install artifacts without leaving the harness.

Publishing a compatible project? Add the **`dsh-plugin` GitHub topic**. The hub
will inspect its `package.json`, `SKILL.md`, or `agent.cordis.yml` and classify
what the harness can actually load.

## What it indexes

Six artifact kinds, each taken from something the harness really loads, each
with its own install mechanism:

| Kind             | What it is                               | How it installs                             |
| ---------------- | ---------------------------------------- | ------------------------------------------- |
| **Bundle**       | npm package declaring `dsh.bundle.patch` | `dsh plugin --profile <p> add <spec>`       |
| **Profile**      | ordered `dsh.profile.bundles` stack      | one `add` per bundle, in order              |
| **Skill**        | `SKILL.md` bundle or flat Markdown       | files written under `$DSH_HOME/skills`      |
| **MCP server**   | external Model Context Protocol server   | a `dsh-mcp-client` row in the profile patch |
| **Agent preset** | directory holding one `agent.cordis.yml` | written to `$DSH_HOME/.agent-presets/<id>`  |
| **Hook bridge**  | Claude Code / Codex hook bridge          | a bridge plugin row in the profile patch    |

## How it works

**From a browser** — search, filter by kind and category, read the plan, copy the
command.

**From inside your agent** — use the hub plugin installed in the quick start.
Signing in uses the OAuth device flow: the plugin prints a code, you approve it
in a browser, and the harness gets a token.

Both paths resolve the **same** install plan from the same domain code, so the
command on the website and the one the agent runs cannot drift apart.

## Repository layout

```
backend/    Domain-Driven Design: domain, application, infrastructure, interfaces
frontend/   Feature-Sliced Design: app, pages, widgets, features, entities, shared
packages/
  dsh-plugin-hub/   the `dsh-hub` bundle users install into their harness
docs/       architecture, layer conventions, operations, ADRs
```

Both halves deploy as **one Cloudflare Worker**: Hono at `/api/*`, React Router
SSR everywhere else, D1 for the catalog and Better Auth's tables, KV for
sessions and rate limiting, and a Cron Trigger that re-crawls every six hours.

## Ten languages

Every page is served in English, Simplified and Traditional Chinese, Japanese,
Korean, Spanish, French, German, Brazilian Portuguese and Russian, under a path
prefix — `/ja/browse`, `/zh-CN/a/<id>` — with English unprefixed at the root.

A directory only ranks if it is found, so the multilingual surface is part of
the product rather than a translation layer bolted on: reciprocal `hreflang`
across all ten, canonical URLs that fold filters and profile previews away,
`schema.org` markup on every plugin page, indexable `/kind/<kind>` and
`/category/<category>` landing pages instead of query-string filters, and a
sitemap set that lists every indexed plugin in every language with its real
`lastmod`.

The catalog itself stays language-neutral: an artifact's summary and readme are
whatever its author wrote, and the frame around them is what gets translated.
See [`docs/seo/`](docs/seo/README.md) and
[`docs/frontend/i18n.md`](docs/frontend/i18n.md).

## Development

```sh
pnpm install
pnpm --filter @dsh-fish/backend run db:generate   # regenerate migrations
pnpm run db:migrate:local                          # apply to local D1
pnpm run dev                                       # http://localhost:5173
```

Quality gates:

```sh
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run build
```

The social cards are generated, not drawn. Re-run them when the palette,
wordmark, or repository positioning changes:

```sh
pnpm --filter @dsh-fish/frontend run og:build
```

This writes the site-wide Open Graph image to `frontend/public/og.png` and the
GitHub repository Social Preview to `.github/social-preview.png`.

Deployment, bindings and secrets: [`docs/operations/deployment.md`](docs/operations/deployment.md).

## Documentation

Start with [`AGENTS.md`](AGENTS.md) (same file as `CLAUDE.md`) for the ground
rules, then:

- [`docs/project/architecture.md`](docs/project/architecture.md) — system architecture and the artifact taxonomy
- [`docs/decisions/adr-0001-plugin-hub-architecture.md`](docs/decisions/adr-0001-plugin-hub-architecture.md) — why it is built this way
- [`docs/frontend/`](docs/frontend/README.md) — FSD conventions
- [`docs/backend/`](docs/backend/README.md) — DDD conventions
- [`docs/seo/`](docs/seo/README.md) — multilingual URLs, indexation, structured data, crawling

## License

MIT
