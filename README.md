<div align="center">
  <img src="frontend/public/icons/whale-brand.png" alt="dsh.fish logo" width="96" />
  <h1>dsh.fish</h1>
  <p><strong>The plugin registry for <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>.<br/>Discover, trust, and install plugins — from the web, the terminal, or your agent.</strong></p>

  <p>
    <a href="https://dsh.fish"><img src="https://img.shields.io/badge/hub-dsh.fish-0b6bcb" alt="dsh.fish hub" /></a>
    <a href="https://github.com/stvlynn/dsh.fish/actions/workflows/ci.yml"><img src="https://github.com/stvlynn/dsh.fish/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="https://www.npmjs.com/package/@dsh-fish/cli"><img src="https://img.shields.io/npm/v/@dsh-fish/cli" alt="npm @dsh-fish/cli" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license" /></a>
    <a href="https://discord.gg/PwZDHH4mv3"><img src="https://img.shields.io/badge/discord-join-5865F2?logo=discord&logoColor=white" alt="Discord" /></a>
  </p>

  <p>
    <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a>
  </p>

  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/home-dark.png" />
    <img src=".github/assets/home-light.png" alt="dsh.fish catalog home page" width="900" />
  </picture>
</div>

---

DeepSeek Harness is built on "everything is a plugin" but ships no registry — its
README asks authors to tag repositories with the `dsh-plugin` topic and leaves
discovery there. dsh.fish turns that topic into a searchable, multilingual
catalog with a shared, machine-executable install plan.

## Features

- **Typed catalog** — bundles, profiles, skills, MCP servers, agent presets and hook bridges, classified by probing what the harness can actually load, not by self-declared tags.
- **Transparent trust signals** — every artifact carries a public, reproducible quality score (S/A/B/C), a maintenance status, and 7d/30d star velocity. The formula is served at [`GET /api/v1/scoring`](https://dsh.fish/api/v1/scoring), not buried in a blog post.
- **Rising, not just popular** — per-sweep metrics snapshots power a `rising` sort that surfaces what is gaining stars this week.
- **One install plan, three surfaces** — the same domain-owned plan renders as a copy-pasteable command on the web, executes in the CLI, and runs inside the harness via the hub plugin. They cannot drift apart.
- **Commit-pinned provenance** — each artifact shows the exact commit it was indexed at, linked back to GitHub.
- **A real API** — versioned REST endpoints plus a full-catalog snapshot with an ETag sync contract for mirrors and bots.
- **Six languages, first-class** — SSR pages in the negotiated language (cookie or `Accept-Language`), a localized Atom feed, machine-translated READMEs, and structured data on every plugin page, per-plugin OG cards and shields-style README badges.

## Screenshots

<div align="center">
  <img src=".github/assets/browse-rising-light.png" alt="Browsing the catalog sorted by rising" width="700" />
  <p><em>Browse by kind, category, popularity — or what is rising right now.</em></p>
  <img src=".github/assets/plugin-detail-light.png" alt="A plugin detail page with score, install panel and README badge" width="700" />
  <p><em>Every plugin page: quality score, install panel, commit provenance, and a copyable README badge.</em></p>
</div>

## Quick start

**Browse** the catalog at **[dsh.fish](https://dsh.fish)** — search, filter by kind
and category, read the install plan, copy the command.

**Terminal** — the CLI applies the plan for you:

```sh
npx @dsh-fish/cli add <artifact-id>
```

`add` / `find` / `list` / `remove` / `update` match the [skills CLI](https://github.com/vercel-labs/skills)
vocabulary and actually write skills, MCP rows, presets and hook bridges into
`$DSH_HOME`.

**Inside the harness** — add the hub plugin once:

```sh
dsh plugin --profile web add github:stvlynn/dsh.fish#main
```

It registers `hub_search`, `hub_show`, `hub_install`, `hub_list`, `hub_remove`,
`hub_update` and `hub_account`, so an agent can discover and install artifacts
without leaving the session. Signing in uses the OAuth device flow.

**Publishing a plugin?** Tag your repository with the **`dsh-plugin`** topic. The
hourly crawl inspects its `package.json`, `SKILL.md` or `agent.cordis.yml` and
classifies what the harness can actually load. MCP servers and hook bridges are
declared in `package.json` as `dsh.hub.kind` with a `dsh.hub.mcp` or
`dsh.hub.hook` block — see
[docs/project/architecture.md](docs/project/architecture.md#how-a-repository-becomes-a-row)
for the manifest shape.

## What it indexes

| Kind             | What it is                                        | How it installs                             |
| ---------------- | ------------------------------------------------- | ------------------------------------------- |
| **Bundle**       | npm package declaring `dsh.bundle.patch`          | `dsh plugin --profile <p> add <spec>`       |
| **Profile**      | ordered `dsh.profile.bundles` stack               | one `add` per bundle, in order              |
| **Skill**        | `SKILL.md` bundle or flat Markdown                | files written under `$DSH_HOME/skills`      |
| **MCP server**   | external server declared via `dsh.hub.mcp`        | a `dsh-mcp-client` row in the profile patch |
| **Agent preset** | directory holding one `agent.cordis.yml`          | written to `$DSH_HOME/.agent-presets/<id>`  |
| **Hook bridge**  | Claude Code / Codex bridge declared via `dsh.hub.hook` | a bridge plugin row in the profile patch |

## Repository layout

```
backend/    Domain-Driven Design: domain, application, infrastructure, interfaces
frontend/   Feature-Sliced Design: app, pages, widgets, features, entities, shared
packages/
  dsh-plugin-hub/   the `dsh-hub` bundle users install into their harness
  dsh-cli/          `@dsh-fish/cli` — `npx @dsh-fish/cli add <id>`
docs/       architecture, layer conventions, operations, ADRs
```

Both halves deploy as **one Cloudflare Worker**: Hono at `/api/*`, React Router
SSR everywhere else, D1 for the catalog, KV for sessions, and a Cron Trigger
that re-crawls every hour.

## Development

```sh
pnpm install
pnpm run dev    # http://localhost:5173
```

Quality gates: `pnpm run typecheck && pnpm run test && pnpm run test:e2e && pnpm run build`.

Deployment, bindings and secrets: [`docs/operations/deployment.md`](docs/operations/deployment.md).
Conventions and architecture: [`AGENTS.md`](AGENTS.md), [`docs/project/architecture.md`](docs/project/architecture.md), [`docs/decisions/`](docs/decisions/README.md).

## Community

- **Source and issues** — [github.com/stvlynn/dsh.fish](https://github.com/stvlynn/dsh.fish)
- **Discord** — [discord.gg/PwZDHH4mv3](https://discord.gg/PwZDHH4mv3)

## License

[MIT](LICENSE)
