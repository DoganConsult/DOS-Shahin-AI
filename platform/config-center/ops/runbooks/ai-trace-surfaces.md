# AI Trace Surfaces — Langfuse v2 dashboard taxonomy

## What this is

Langfuse v2 has no public "saved dashboards" REST API. The DOS Platform
provides equivalent enterprise functionality through:

1. **Surface tag taxonomy** — every trace published to Langfuse carries
   exactly one `surface:<slug>` tag identifying which AI-OS surface produced
   it. The tagging is enforced by the OTEL exporter and the Langfuse Node SDK
   wrapper in `packages/dos-platform-core/src/observability/langfuse.ts`.

2. **DNOC AI Trace Surfaces dashboard** — Angular workspace page at
   `/workspace/dnoc/ai-trace-surfaces` that renders deep-link cards into
   Langfuse trace lists pre-filtered by surface tag.

3. **Live trace counts** — engine endpoint `/api/dnoc-ai/langfuse-counts`
   reads the Langfuse Postgres directly and returns last-24h trace count
   per surface, surfaced on each card.

## Authoritative surface list

| Surface tag | Category | Producer | Description |
|---|---|---|---|
| `surface:landing-copilot` | public | landing copilot widget | Public marketing copilot — anonymous + auth'd traffic |
| `surface:agent-A01` … `agent-A12` | agent | per-agent runtime | The 12 canonical AGRC agents (see `packages/shahin-product/src/agrc-agents.ts`) |
| `surface:openclaw-a2a` | system | OpenClaw A2A | Agent-to-agent calls (handoffs, delegations) |
| `surface:mcp-tool` | system | MCP gateway | Model Context Protocol tool invocations |
| `surface:rag-search` | system | RAG service | Retrieval Augmented Generation queries |
| `surface:agent-lifecycle` | system | gating + cost-cap + SoD | Registry / gating / cost-cap / SoD policy decisions |

## Adding a new surface

1. In the producer code, ensure every trace is tagged with `surface:<slug>`
   exactly once. Do this at the OTEL exporter boundary, never inline at call
   sites — see `langfuse.ts` for the helper.
2. Add a new card entry to the `groups` array in
   `products/shahin-ai/app/src/app/blueprint/features/dnoc/pages/dnoc-ai-trace-surfaces.component.ts`.
3. Rebuild the Shahin SPA. `pm2 restart product-shell`.

The Langfuse SQL `langfuse-counts` query auto-discovers any tag prefixed
with `surface:` — no engine-side change needed when adding new surfaces.

## Operator deep-links

For a quick check without the dashboard, the URL format is:

```
/admin/langfuse/project/ai-engine-service/traces?filter=<JSON-encoded filter>
```

where the filter is:

```json
[{"type":"stringOptions","column":"tags","operator":"any of","value":["surface:agent-A01"]}]
```

URL-encode and append. The dashboard component generates these
programmatically — copy the rendered href if you need a bookmarkable link.

## Why not a SQL-seeded dashboard

Langfuse v2 stores no `dashboards` table — the public landing pages and
metrics views are all hardcoded in the Next.js UI. v3 introduces saved
dashboards with a public API, at which point this runbook should be
replaced with a script that POSTs to `/api/public/dashboards`. Until
then, the Angular component is the system of record for the AI-OS
dashboard taxonomy.

## Linked

- Email/Slack alert dispatch: `services/notification-service/src/events/notification.consumers.ts` (`ai.alert.fired` subscriber)
- DNOC AI Operations dashboard: `dnoc-ai-operations.component.ts`
- DSOC AI Security dashboard: `dsoc-ai-security.component.ts`
- Keycloak `ai_ops_oncall` role: `ops/keycloak/provision-ai-ops-roles.sh`
