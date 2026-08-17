# Architecture

> System architecture for **dsh.fish**, the plugin hub for DeepSeek Harness.

## What this system is

dsh.fish is a discovery, distribution and installation service for every kind of
artifact the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
can load. The harness has no registry of its own — its README asks authors to
tag repositories with the `dsh-plugin` topic and leaves discovery there. This
project is that missing registry, plus the install path on both ends: a website
a human browses, and a harness plugin an agent drives.

## Technology stack

| Concern | Choice |
|---|---|
| Runtime | Cloudflare Workers (`nodejs_compat`) |
| Frontend | React 19 + React Router 8 (SSR), Tailwind CSS 4, beui components |
| Backend | Hono, layered DDD |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Cache / secondary storage | Cloudflare KV |
| Auth | Better Auth (`better-auth-cloudflare`), GitHub OAuth + email/password + OAuth device grant |
| Scheduled work | Workers Cron Triggers |

## Deployment topology

One Worker serves both halves of the product.

```text
                    ┌──────────────────────────────────────────┐
   browser ────────▶│  Worker (dsh.fish)                       │
   harness ────────▶│                                          │
                    │   /api/*  → Hono app (interfaces layer)  │
                    │   /*      → React Router SSR handler     │
                    │   cron    → IngestCatalog use case       │
                    └───────────────┬──────────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
                    D1 (catalog +        KV (sessions,
                    Better Auth)         rate limiting,
                                         crawl cursor)
```

Sharing an origin is a deliberate choice, not an accident of packaging:

- Better Auth's session cookie needs no cross-subdomain configuration.
- The browser makes no CORS preflight before a search.
- **Loaders call use cases in-process.** A server-rendered artifact page costs
  one D1 round trip rather than an HTTP hop back into the same Worker. See
  `frontend/src/shared/api/hub-context.ts`.

## Module boundaries

### Backend — Domain-Driven Design

`backend/src/`, dependencies pointing inward.

| Layer | Contents |
|---|---|
| `domain/` | `Artifact` aggregate, `ArtifactKind`, `ArtifactPayload`, `InstallPlan`, `Submission`, `Account`, `ogImageUrl`, repository ports |
| `application/` | Use cases (`SearchArtifacts`, `ResolveInstallPlan`, `SubmitArtifact`, `IngestCatalog`, …), DTOs, indexer ports |
| `infrastructure/` | D1 repositories, Better Auth composition, GitHub/npm indexers, the container |
| `interfaces/` | Hono routers, Zod request schemas, the domain-error → HTTP mapping |

The domain has no dependency on Hono, Drizzle, Better Auth or Workers types
beyond value objects. `infrastructure/container.ts` is the composition root and
is built **per request**, because D1 and KV bindings arrive per request.

### Frontend — Feature-Sliced Design

`frontend/src/`, imports flowing only downward.

| Layer | Contents |
|---|---|
| `app/` | `root.tsx`, `routes.ts`, global styles |
| `pages/` | One slice per route; composes widgets, owns loaders |
| `widgets/` | `site-header`, `site-footer`, `catalog-grid`, `catalog-filters`, `catalog-pagination`, `install-panel` |
| `features/` | `account-menu` — the signed-in identity and the actions on it; `locale-switcher` — the language of the page you are on |
| `entities/` | `artifact` — types re-exported from the backend DTO contract, plus `ArtifactCard`, `KindChip`, `artifactLd` |
| `shared/` | beui components (`ui/motion/`, `ui/avatar`, `ui/animated-number`), motion tokens, `config/i18n` (locales and catalogs), `lib/seo`, auth client, `hub-context` |

The account slot in the header is the whole signed-in affordance: signed out it
is the sign-in call to action; signed in it is the portrait Better Auth cached
from the OAuth profile — GitHub's, for most accounts — opening a beui popover
that carries the dashboard link and sign-out. Nothing about the account is
duplicated in the navigation, at any width.

React Router requires every route module to live inside `appDirectory`, so
`appDirectory` is `src` — the whole FSD tree. `src/root.tsx` and `src/routes.ts`
are one-line re-exports of the real modules in the `app` layer, so the framework
convention is satisfied without moving application setup out of its layer.

## The discovery surface

A registry is a search product with no traffic of its own: nobody bookmarks a
plugin page, they find it. That makes the crawler-facing surface part of the
architecture rather than a finishing touch.

**Ten languages, in the URL.** Every reader-facing route carries an optional
`:locale?` first segment, so one route module serves `/browse` (English,
unprefixed) and `/ja/browse` alike. Each loader passes that segment through
`requireLocale`, which 404s anything that is not a declared language — without
it, an optional segment matches everything and the site publishes an unbounded
set of URLs rendering one page.

**Two crawlable facet axes.** `/kind/:kind` and `/category/:category` are real
pages, not query strings, because that is the form an engine will rank and the
form the footer can link from every page on the site.

**Four resource routes.** `/robots.txt`, `/sitemap.xml` and the two sitemap
files it indexes are React Router routes with a `loader` and no component, so
they resolve their data through the same container as every page — the artifact
sitemap reads `ListSitemapEntries`, an application use case over a dedicated
`ArtifactRepository.listForSitemap` projection rather than over search.

Full treatment in [`../seo/README.md`](../seo/README.md); language conventions
in [`../frontend/i18n.md`](../frontend/i18n.md).

## The artifact taxonomy

Six kinds, each taken from something the harness actually loads, each with a
distinct install mechanism. `ArtifactKind` names them; `buildInstallPlan` owns
how each reaches a machine.

| Kind | What it is | How it installs |
|---|---|---|
| `bundle` | npm package declaring `dsh.bundle.patch` | `dsh plugin --profile <p> add <spec>` |
| `profile` | ordered `dsh.profile.bundles` stack | one `add` per bundle, in order |
| `skill` | `SKILL.md` bundle or flat Markdown | files written under `$DSH_HOME/skills` |
| `mcp-server` | external MCP server | a `dsh-mcp-client` row in the profile patch |
| `agent-preset` | directory holding one `agent.cordis.yml` | written to `$DSH_HOME/.agent-presets/<id>` |
| `hook-bridge` | Claude Code / Codex hook bridge | a bridge plugin row in the profile patch |

## How a repository becomes a row

The `dsh-plugin` topic is a seed list, not a manifest: most of what carries it
is an application that mentions the harness. So a repository is classified by
what it holds, in this order, and a repository that answers none of the three
yields nothing — the harness would load nothing from it either.

| Probe | Row |
|---|---|
| `package.json` with `dsh.profile.bundles` | `profile` |
| `package.json` with `dsh.bundle` | `bundle` |
| `SKILL.md` with `name` + `description` frontmatter | `skill` |
| `agent.cordis.yml` | `agent-preset` |

Those probes run before anything else is fetched, so a repository that is not a
plugin costs three reads and no API quota — that ordering is what makes it
affordable to page deep into a topic of several thousand repositories.

Categories are resolved separately, and never block a row: a valid
`dsh.hub.categories` declaration wins, otherwise `category-inference.ts` reads
topics, keywords and the description against a fixed token table, and `other` is
the floor. See ADR-0001 §8.

## Cross-cutting concerns

### The install plan is the contract

`domain/artifact/install-plan.ts` is the single place that knows how each kind
installs. It returns both `steps` (machine-executable) and `manualCommands`
(copy-paste). The website renders the second; the `dsh-hub` plugin executes the
first. Because neither surface authors its own commands, a documented command
and an agent-driven install cannot drift apart.

### Secrets are referenced, never stored

An MCP server's payload carries a credential *reference* — a POSIX environment
variable name — never a value, mirroring the harness's own credentials doctrine.
That is what makes a catalog row safe to serve publicly and safe to render in a
configuration UI.

### Two authentication channels, unequal trust

A browser session cookie and a device-grant bearer token both resolve to the
same account, but `Actor.channel` distinguishes them. `requireInteractiveSession`
restricts account-shaped writes — submitting, claiming — to a real browser
session, so a harness token cannot publish on a user's behalf.

The `Account` the domain sees carries no source-host identity. Whether a
submitter owns a repository is answered by `LinkedIdentityReader`, which reads
the OAuth link out of Better Auth's `accounts` table at the moment the claim is
made. Keeping it off the account is deliberate: see ADR-0001 §7.

### Errors

The domain throws `DomainError` with a code; `interfaces/http/error-mapper.ts`
maps codes to HTTP statuses and emits the one envelope described in
[`backend/api-conventions.md`](../backend/api-conventions.md). Unexpected
failures never leak their message — it may carry a binding name or a token.

### Theming is server-rendered from a cookie

The theme class on `<html>` is written by the root loader from a `theme` cookie,
not by an inline script reading `localStorage`. React owns the document element
during hydration and reconciles away any class a script set before it, which
both reverts the theme and raises a hydration mismatch — a cookie is the only
theme store the server can read, so client and server agree from the first byte.
With no cookie, no class is emitted and the stylesheet follows
`prefers-color-scheme`; an explicit choice writes `light` or `dark`, and `light`
is what lets a user override a dark OS setting.

Related: the raw colour properties (`--bg`, `--fg`, …) deliberately do not share
names with the `@theme inline` keys that consume them. `inline` substitutes the
resolved value straight into each utility, so a theme key defined as
`var(--color-background)` bakes the light value into `bg-background` and no dark
override can reach it.

### One accent, and kinds are named not coloured

Artifact kinds are distinguished by their label, not by a hue. Six per-kind
colours competed with the accent and encoded nothing a reader could learn; the
chip already says "MCP server" in words, which is unambiguous, translatable and
readable without colour vision. Colour is reserved for the primary action and
the verified badge.

### Catalog cards use the repository Social preview as texture

When an artifact's source has a GitHub repository, the crawler stores the
image GitHub would emit as `og:image`: an author-uploaded Social preview
(`repository-images.githubusercontent.com`) if one exists, otherwise the
generated Open Graph card (`opengraph.githubassets.com/{key}/{owner}/{repo}`).
The owner's avatar is neither, and is rejected by `ogImageUrl()` in the
domain. An npm packument contributes a preview only when its `repository`
field points at GitHub.

The URL is a domain value. Only those two hosts are accepted, so a
submission cannot paint an arbitrary tracker onto every catalog card.

On the card, the image is a blurred, desaturated, low-opacity backdrop
with a `var(--card)` gradient scrim. Type stays on `--fg` / `--muted-fg`.
Opacity, blur and the scrim are CSS variables in `app.css` — theme
differences do not scatter as `dark:` on the component.

### Counts tick through a shared NumberFlow wrapper

`@number-flow/react` is wrapped in `shared/ui/animated-number.tsx`. Compact
formatting (`1.2k`) stays in `compactNumberParts` so Cloudflare's ICU and
the browser cannot disagree at hydration. The wrapper pins `locales="en"`
and explicit fraction digits. First paint is static; digits only spin if
that instance's value later changes, so scanning the grid does not animate.

### Readmes are third-party content, rendered structurally

A plugin's readme is a crawl of somebody else's repository, so
`frontend/src/shared/ui/markdown.tsx` renders it without ever handing markup to
the DOM: `react-markdown` builds React elements from an AST, `skipHtml` drops
raw HTML rather than passing it through, every URL goes through
`defaultUrlTransform`'s protocol allowlist, and only the tags mapped in that
file can be produced. There is no `dangerouslySetInnerHTML` and no sanitiser
pass to keep ahead of attackers. `markdown.test.tsx` asserts these properties
against the emitted markup, so a refactor that re-enables raw HTML fails there.

A readme's *relative* paths were written against its own repository, not against
this site. `sourceDocBase` and `sourceAssetBase` in
`backend/src/domain/artifact/source-ref.ts` say what such a path resolves to —
a browsable page for a document, raw bytes for an image — and reach the page
through `ArtifactDetailDto`. Both are absent for npm and submission sources,
where no root is knowable; a relative path then renders as text rather than as a
confident 404.

On a phone, a readme is also a layout problem: grid items default to
`min-width: auto`, so a wide GFM table or an unbroken DSN becomes the column
width and the page scrolls sideways. The plugin page pins `min-w-0` on the
readme column, and the markdown container sets `overflow-wrap: anywhere` for
tokens that have no break point. Tables and fences keep their own
`overflow-x-auto`. `pnpm run test:e2e` locks this at six device resolutions.

### No hardcoded copy

`frontend/src/shared/config/i18n/messages/` holds every user-facing string. The
backend sends message *keys* (`artifactKind.bundle.label`,
`install.warning.buildAllowance`), never prose, so the catalog stays
language-neutral in the database.

## Related documents

- [`decisions/adr-0001-plugin-hub-architecture.md`](../decisions/adr-0001-plugin-hub-architecture.md)
- [`operations/deployment.md`](../operations/deployment.md)
- [`frontend/README.md`](../frontend/README.md), [`backend/README.md`](../backend/README.md)
