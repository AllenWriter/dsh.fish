# ADR 0004: Artifact ask via Ada

## Status

- Accepted

## Context

GitHub-sourced plugin pages should let a reader ask a question about the
repository without leaving dsh.fish. Three ways of answering were on the table:

1. **DeepWiki MCP** (`ask_question`) — official, but the tool result is a single
   JSON-RPC payload after several seconds. There is no incremental stream and no
   shared conversation: consecutive asks do not keep context.
2. **Vercel AI SDK** wrapping some upstream — would introduce a second streaming
   protocol (the AI SDK data stream) and a dependency the rest of the catalog
   does not use.
3. **Ada**, the API the public DeepWiki site already uses (`POST /ada/query`
   then `wss://api.devin.ai/ada/ws/query/{queryId}`). It streams file scans and
   answer deltas, and a follow-up reuses `query_id`. It is unofficial: the
   browser must never call `api.devin.ai` (CORS / Origin), and we have no SLA.

The product need is an interactive panel with streaming and multi-turn, not a
one-shot FAQ. MCP cannot do that. The AI SDK would only re-encode Ada.

Abuse control is a separate question. The rest of the catalog is anonymous; a
login wall would be a new product surface. Ada may have its own limiter — we
do not know, and CI must never discover that by hitting the live API.

## Decision

- **Ada is the model.** The Worker proxies Fast mode only
  (`mode: 'fast'` / DeepWiki's `multihop_faster` engine). The browser talks
  solely to `POST /api/v1/artifacts/:id/ask`. No Vercel AI SDK, no DeepWiki MCP
  for the interactive panel, no extra Cloudflare Agents Durable Object (README
  i18n stays isolated).
- **Anonymous**, like the rest of the catalog. Abuse control is **our** KV
  limiter (per IP, per artifact, global, plus a circuit that trips when Ada
  itself returns 429).
- **GitHub sources only.** `SourceRef.origin === 'github'` supplies `owner/repo`.
  npm and submission rows get no entry.
- **No D1 transcripts.** `query_id` lives in the browser for the tab; the Worker
  is stateless besides KV counters.
- **SSE out, JSON envelope in.** Streaming is an explicit exception to
  [`api-conventions.md`](../backend/api-conventions.md); errors before the
  stream starts still use the existing envelope. Mapped events are `file`,
  `delta`, `cite`, `done`, and `error` — Ada's JSON never leaves the Worker.
- **Feature flag** `ARTIFACT_ASK_ENABLED` (Wrangler var, default off in
  production until a live probe has a result).

### Live-probe ethics

`scripts/ada-live-probe.ts` is the only process allowed to call `api.devin.ai`
from this repository. It is gated on `LIVE_ADA_PROBE=1`, capped at 20 Fast
requests per run, aborts on 429/403, and is not wired into GitHub Actions.

Pass criteria for “Ada has a limiter”: any 429/403 with a Retry-After, or
systematic WebSocket close under concurrency 2. Pass criteria for “none
observed”: all 20 complete. Completing 20 requests **does not prove** there is
no limit — it only means none showed up in that bounded run.

After one successful probe, production `ARTIFACT_ASK_ENABLED` may be turned on
and our KV numbers tightened to sit **below** whatever Ada showed (or kept at
the conservative v1 caps if Ada never 429’d).

## Consequences

- The Worker holds Ada credentials-by-origin only (public, unauthenticated).
  If Ada starts requiring a key or blocking our `source` string, the panel
  goes 503 (`UNAVAILABLE`) rather than inventing a second model.
- Follow-up questions in one tab work; a refresh starts a new `query_id`.
  There is no resume across devices.
- npm-only plugins cannot be asked about until someone infers a GitHub repo
  (out of scope).
- Crawlers never see Q&A transcripts: the panel is client-only.

## Alternatives considered

- **DeepWiki MCP** — rejected for v1 because it cannot stream or keep a thread.
- **Vercel AI SDK data protocol** — rejected as an extra encoding over Ada.
- **Login-gated ask** — rejected; the catalog is anonymous and a login wall
  would not replace our limiter.
- **Persisted threads in D1 / a Durable Object** — rejected; v1 is a tab-local
  conversation.

## References

- [`../backend/api-conventions.md`](../backend/api-conventions.md) — SSE exception.
- [`../operations/deployment.md`](../operations/deployment.md) — flag, limiter vars, probe.
- [`../quality/testing.md`](../quality/testing.md) — CI never hits Ada.
