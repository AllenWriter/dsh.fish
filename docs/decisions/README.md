# Decisions

This section records architecture decision records (ADRs). Each ADR explains why a significant decision was made and what alternatives were considered.

## When to write an ADR

Write an ADR when the decision:

- Is hard to reverse.
- Affects multiple layers or teams.
- Has non-obvious trade-offs.

## Existing decisions

- [`adr-template.md`](adr-template.md) — template for new ADRs.
- [`adr-0001-plugin-hub-architecture.md`](adr-0001-plugin-hub-architecture.md) — the plugin hub architecture.
- [`adr-0002-negotiated-locale-urls.md`](adr-0002-negotiated-locale-urls.md) — one URL per document; language negotiated per request. Superseded.
- [`adr-0003-locale-prefix-with-preference-cookie.md`](adr-0003-locale-prefix-with-preference-cookie.md) — language prefixes, plus a cookie that remembers the reader's choice.

## Naming

Use a sequential number and a short kebab-case title:

```
decisions/
  001-use-uuid-for-ids.md
  002-choose-postgresql.md
```
