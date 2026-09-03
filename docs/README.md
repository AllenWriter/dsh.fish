# Documentation

This directory is the single source of truth for how this project is built, organized, and evolved by agents. It is **not** the public documentation on dsh.fish.

- **This tree (`docs/`)** — conventions, architecture, operations, ADRs. Agents read these files in the repository. Do not turn them into a website.
- **The site (`/docs`)** — how to publish a plugin, use the CLI, and read the score. That surface is static Markdown under `/docs/*`: bodies are copied to public assets at build and fetched through the ASSETS binding, never compiled into the Worker. See [`decisions/adr-0005-product-docs-with-fumadocs.md`](decisions/adr-0005-product-docs-with-fumadocs.md).
- **The site (`/blog`)** — dated editorial posts in four series (Harness releases, DeepSeek notes, this hub's changelog, technical notes). Static Markdown like `/docs`, with a newsroom shell rather than a docs sidebar. See [`decisions/adr-0007-editorial-blog.md`](decisions/adr-0007-editorial-blog.md).

## Domain map

- [`project/`](project/README.md) — project overview, goals, architecture, and boundaries.
- [`frontend/`](frontend/README.md) — Feature-Sliced Design (FSD) conventions.
- [`backend/`](backend/README.md) — Domain-Driven Design (DDD) layered conventions.
- [`seo/`](seo/README.md) — multilingual URLs, indexation, structured data, crawling.
- [`operations/`](operations/README.md) — local development, CI/CD, and deployment.
- [`quality/`](quality/README.md) — testing strategy and code-review expectations.
- [`decisions/`](decisions/README.md) — architecture decision records (ADRs).

## How to use this documentation

1. If you are new to the project, read [`project/README.md`](project/README.md) and [`project/architecture.md`](project/architecture.md) first.
2. Before writing frontend code, read [`frontend/README.md`](frontend/README.md).
3. Before writing backend code, read [`backend/README.md`](backend/README.md).
4. Before changing a URL, a page title, or anything a crawler reads, read [`seo/README.md`](seo/README.md).
5. Before changing deployment, build, or operational behavior, read [`operations/README.md`](operations/README.md).
6. If you change behavior, architecture, or conventions, update the relevant doc in the same change set.
