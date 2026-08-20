# Frontend

This section defines how the frontend is organized using **Feature-Sliced Design (FSD)**.

## Documents

- [`fsd-overview.md`](fsd-overview.md) — what FSD is and why it is used.
- [`layers.md`](layers.md) — responsibilities of each FSD layer.
- [`slices.md`](slices.md) — how to split code into slices.
- [`segments.md`](segments.md) — `ui`, `model`, `lib`, `api`, `config` segments.
- [`public-api.md`](public-api.md) — public API and re-export rules.
- [`import-rules.md`](import-rules.md) — cross-layer and cross-slice import rules.
- [`ui-patterns.md`](ui-patterns.md) — semantic styling, no hardcoded copy, no redundant copy.
- [`i18n.md`](i18n.md) — locales, message catalogs, locale-aware links and loaders.
- [`streaming.md`](streaming.md) — arrival vs display clocks for model-native text.

## Quick start

1. Read [`fsd-overview.md`](fsd-overview.md) if FSD is new to you.
2. Read [`layers.md`](layers.md) to understand where a new file belongs.
3. Read [`import-rules.md`](import-rules.md) before adding any import.
4. Read [`ui-patterns.md`](ui-patterns.md) before writing UI code.
5. Read [`i18n.md`](i18n.md) before writing any user-facing string or internal link.

The artifact page composes `widgets/artifact-ask` around `features/ask-artifact`.
Desktop is a layout column (beUI `Button` + `IconSwap`); below `lg` it is
beUI `bottom-sheet`. Message / prompt-input / streaming-response /
agent-activity / citations / loading-states (`thinking-shimmer`,
`reasoning-text`, `agent-progress`) are vendored under `shared/ui/`. Do not use
beUI `drawer` here — that overlay blurs the plugin page.

## Core principle

Code is organized by **scope of change**, not by technical type. A feature contains everything it needs — UI, state, API, and utilities — so that changes to one feature do not leak into unrelated files.
