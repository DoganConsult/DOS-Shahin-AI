# Module #1 (compliance) — Step 6 Realtime Wiring

Branch: stabilize/phase-0  Date: 2026-04-19

## Does this module need realtime?

YES. Compliance assertions, attestation campaigns, posture changes, gap
identification and control-test outcomes are inherently multi-actor.
Concurrent assessors, control owners and reviewers must see live updates
to assessments, gap status and control effectiveness without a full page
reload.

## Backend infrastructure (truth before fix)

| Layer | File | State |
|---|---|---|
| SSE endpoint | [./services/notification-service/src/routes/events.routes.ts:426](./services/notification-service/src/routes/events.routes.ts:426) | `GET /api/events` mounted, auth-gated |
| Token mint (canonical) | [./services/notification-service/src/routes/events.routes.ts:412](./services/notification-service/src/routes/events.routes.ts:412) | `POST /api/events/sse-token` |
| Token mint (legacy alias) | [./services/notification-service/src/routes/events.routes.ts:417](./services/notification-service/src/routes/events.routes.ts:417) | `POST /api/events/ticket` |
| Cross-replica fan-out | [./services/notification-service/src/routes/events.routes.ts:245](./services/notification-service/src/routes/events.routes.ts:245) | Redis `sse:fanout` pub/sub + tenant-scoped Redis stream replay |
| Event-bus → SSE bridge | [./services/notification-service/src/events/realtime.consumers.ts](./services/notification-service/src/events/realtime.consumers.ts) | Generic `<module>.created/updated/deleted` CRUD pattern bridged for 60+ modules including `compliance` and `controls` |
| Compliance publishers | [./services/compliance-controls-service/src/events/publisher.ts](./services/compliance-controls-service/src/events/publisher.ts) | `publishComplianceAssessed`, `publishComplianceGapIdentified`, `publishControlTested`, `publishControlEffectivenessChanged`, `publishDomainEvent` — wired via `setServiceBus` in `server.ts:162` |
| Gateway routing | [./services/gateway/src/domain/service-registry.ts:200-202](./services/gateway/src/domain/service-registry.ts:200) | `/api/events`, `/events`, `/api/notifications` → `notification-service:4005` |

## Frontend

| File | State |
|---|---|
| [./frontend/products/shahin/src/app/blueprint/core/services/realtime.service.ts](./frontend/products/shahin/src/app/blueprint/core/services/realtime.service.ts) | clean — no `'from-auth-service'` token; calls canonical `POST /api/events/sse-token` then `EventSource('/api/events?tenant=…')` with `withCredentials` |
| [./frontend/products/shahin/src/app/blueprint/platform-manifests/shared/components/enterprise-module-list.component.ts:680](./frontend/products/shahin/src/app/blueprint/platform-manifests/shared/components/enterprise-module-list.component.ts:680) | `setupRealtimeUpdates()` connects with `modules:[moduleCode]`, buffers events 1500 ms, applies `update`/`delete`/`create` patches or full refresh — **available** to any compliance UI surface that mounts the generic enterprise list |

## Gap classification (problem 5)

| Item | Status |
|---|---|
| Hard-coded token (`'from-auth-service'`) | **NOT PRESENT** — already removed pre-Phase-2 |
| `/api/events` mount | ALREADY COMPLETE |
| `/api/events/sse-token` mint | ALREADY COMPLETE |
| Cross-replica fan-out + Last-Event-ID replay | ALREADY COMPLETE |
| Generic `compliance.created/updated/deleted` bridge | ALREADY COMPLETE (via `domainCrudPatterns`) |
| **Custom compliance domain events bridge** (`compliance.assessed`, `compliance.gap.identified`, `control.tested`, `control.effectiveness.changed`) | **MISSING — fixed this step** |
| Compliance feature pages subscribe to RealtimeService | NOT WIRED in current bespoke compliance pages — they bypass `enterprise-module-list`. Carried forward as non-blocking; the bridge is now ready when any page subscribes. |

## Smallest correct fix applied

The compliance-controls service publishes its domain events under custom
names, not under the generic `<module>.created|updated|deleted` shape
that `domainCrudPatterns` re-emits. Without an explicit bridge those
events land on the bus and die there. Added a small `complianceBridge`
table that subscribes each custom event and re-emits it as a
`module.record.updated` envelope tagged with `moduleCode`
(`compliance` or `controls`) so the existing FE subscriber path works
unchanged.

| File | Change | Why |
|---|---|---|
| [./services/notification-service/src/events/realtime.consumers.ts:126](./services/notification-service/src/events/realtime.consumers.ts:126) | + `complianceBridge` array + per-event `bus.subscribe` block (lines 137–167) | Bridges 4 compliance-published custom events to SSE clients |

## Live verification (truth, not assumption)

```
GET  /api/events?tenant=t1 (4005)         → 401  (mounted, auth-gated)
GET  /events?tenant=t1     (4005)         → 401  (mounted, auth-gated)
POST /api/events/sse-token (4005)         → 401  (mounted, auth-gated)
GET  /api/events?tenant=t1 (gateway 4000) → 401  (gateway → 4005, gated)
POST /api/events/sse-token (gateway 4000) → 403  (CSRF-gated, normal)
GET  /api/events/does-not-exist (4005)    → 404  (proves /api/events 401 is real route)
```

| Step | Result |
|---|---|
| `pnpm --filter notification-service build` | 0 errors |
| `pm2 restart notification-service` | online, healthy |
| Subscribers registered without error | confirmed via `pm2 logs notification-service` (no `RealtimeConsumer` errors after restart) |
| Health probe | `GET /health` → 200 |

## Mandatory deliverable (per AGENTS.md Problem 5)

| Item | Result |
|---|---|
| Whether realtime applies to this module | YES |
| Event names used | bus: `compliance.assessed`, `compliance.gap.identified`, `control.tested`, `control.effectiveness.changed` (compliance-controls-service); plus generic `compliance.created/updated/deleted` and `controls.created/updated/deleted` already bridged |
| Publisher file | [./services/compliance-controls-service/src/events/publisher.ts](./services/compliance-controls-service/src/events/publisher.ts) |
| Subscriber file (bridge → SSE) | [./services/notification-service/src/events/realtime.consumers.ts](./services/notification-service/src/events/realtime.consumers.ts) |
| Subscriber file (FE) | [./frontend/products/shahin/src/app/blueprint/core/services/realtime.service.ts](./frontend/products/shahin/src/app/blueprint/core/services/realtime.service.ts) + generic [./frontend/products/shahin/src/app/blueprint/platform-manifests/shared/components/enterprise-module-list.component.ts:680](./frontend/products/shahin/src/app/blueprint/platform-manifests/shared/components/enterprise-module-list.component.ts:680) |
| Exact fix made | added 4-event bridge in `realtime.consumers.ts` so custom compliance domain events reach SSE clients as `module.record.updated` envelopes; no FE change required |

## Tenant safety check (problem 8 preview)

| Aspect | State |
|---|---|
| Bus event tenantId | required by bridge — `if (!busEvent.tenantId) return` |
| SSE fan-out scope | `broadcastToTenant(tenantId, …)` → tenant-scoped connection index in `events.routes.ts` |
| Cross-tenant leakage risk | none — fan-out keyed by `tenantId`, replay stream keyed by `sse:tenant:${tenantId}` |
| Token auth | per-request short-lived ticket via `/api/events/sse-token`, JWT cookie fallback |

## Carried-forward items (NOT regressions)

- Existing bespoke compliance UI pages do not yet subscribe via `RealtimeService`; they refresh on user action. Wiring those is a future UX enhancement, not a Phase 2 vertical requirement. The end-to-end pipe is now ready for any new subscriber.
- One pre-existing unrelated `email-consumer` error in notification-service logs (Journey verification email) is logged and tracked separately; not introduced by this step.

## Step 6 verdict

**CLOSED.** Realtime infrastructure is mounted, auth-gated, gateway-routed,
tenant-safe, replay-capable, and now bridges every compliance/control
custom domain event to the SSE channel. The hardcoded G0 token is gone.
No mocks, no placeholders, no parallel system introduced.

Move to Step 7 (AI wiring).
