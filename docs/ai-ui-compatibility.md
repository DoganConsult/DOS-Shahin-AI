# AI ↔ UI Compatibility (UI-OS + Dynamic UI)

This document describes the production-ready compatibility work that keeps AI surfaces working with the UI system and Dynamic UI pipeline, including realtime updates, stability safeguards, and rollback procedures.

## Scope

- UI runtime (Angular SPA) consumes realtime signals and refreshes affected UI regions without full reload.
- Dynamic UI widgets render deterministically (no silent skips for AI widget keys).
- AI module mutations participate in the UI live-refresh loop (HTTP mutation bus).
- Production deployment exposes the correct realtime endpoint.

## Integration Points (Current)

- Dynamic UI rendering pipeline: `DynamicPageHostComponent` + `DynamicWidgetResolver` + `WIDGET_KEY_MAP`.
- Realtime transport: browser connects to `/ws` and consumes `WsEventEnvelope` events (`type`, `data`, `timestamp`).
- UI live-refresh loop: `grcMutationInterceptor` emits entity changes on successful HTTP mutations.
- AI surface widgets:
  - AI panel widget (`AiPanelComponent`) fetches AI summaries from `/api/ai/*` endpoints.
  - AI platform services publish WS events through notification-service (via the platform realtime port and event bus).

## Compatibility Gaps Resolved

### 1) Production `/ws` endpoint routed to the wrong service

**Problem**
- In production, nginx routed `/ws` to the gateway websocket handler.
- The gateway websocket handler is a heartbeat-only implementation and does not fan out platform realtime events.

**Fix**
- nginx now routes `/ws` to `notification-service` (`127.0.0.1:4005`), which is the canonical fanout server.

File:
- `platform/config-center/ops/nginx/dos-platform.conf`

### 2) Frontend websocket client routing mismatched event types

**Problem**
- The frontend router expected legacy `notification` / `data_update` event types.
- notification-service emits dotted event types like `notification.created`, `notification.unread_count.updated`, and `system.*`.

**Fix**
- WebSocket event routing now:
  - routes `notification.*` → notifications stream
  - routes `ui.*`, `admin.*`, `ai.*` → dataUpdates stream
  - ignores `system.*`
- Normalizes `event.data.eventType = event.type` when not present to preserve existing consumers.
- Emits `reconnected$` on successful reconnect and stops reconnecting on close code `4001`.

File:
- `platform/runtime/websocket/websocket-notification.service.ts`

### 3) Dynamic UI missed AI widget keys (silent skip)

**Problem**
- AI widget keys existed in the spec type families but had no registered loaders in `WIDGET_KEY_MAP`.
- Dynamic UI would silently skip missing widget loaders (render-miss telemetry only).

**Fix**
- Registered AI widget keys:
  - `ai-recommendations-panel`
  - `agent-copilot-panel`
- Bound both keys to the existing AI panel component for stable rendering.
- Added `config` setter support to `AiPanelComponent` so Dynamic UI can inject per-instance module selection via `slot.config.module`.

Files:
- `platform/config-center/shared/dynamic-ui/registry/widget-key-map.ts`
- `platform/foundation/ui/shared/ai-panel/ai-panel.component.ts`

### 4) Realtime invalidation support for Dynamic UI pages

**Problem**
- Dynamic UI host only re-rendered on route navigation, not on realtime invalidation signals.

**Fix**
- Dynamic page host now re-renders (throttled) when it receives `ui.dynamic_ui.changed`, `ui.widget.invalidate`, or `ui.route.invalidate` on the websocket `dataUpdates$` stream.

File:
- `platform/config-center/shared/dynamic-ui/components/dynamic-page-host.component.ts`

### 5) AI endpoint mutations were not classified for UI live refresh

**Problem**
- The HTTP mutation interceptor did not recognize AI endpoint patterns, so UI live refresh did not trigger for AI mutations.

**Fix**
- Added AI URL patterns mapped to entity `ai` in the interceptor.

File:
- `platform/runtime/interceptors/grc-mutation.interceptor.ts`

## Event Contract for Realtime UI Updates

To trigger a Dynamic UI rerender (without a full page reload), publish one of:

- `type: 'ui.dynamic_ui.changed'`, `data: { route?: string }`
- `type: 'ui.route.invalidate'`, `data: { route: string }`
- `type: 'ui.widget.invalidate'`, `data: { route?: string, widgetKey?: string }`

The client normalizes `data.eventType` from `type` when missing, so consumers may check either field.

## Performance / Stability Safeguards

- Dynamic UI invalidations are throttled to avoid rerender storms (`auditTime(250)`).
- WebSocket client caps reconnect attempts and stops reconnecting on explicit auth failure (`4001`).
- Missing widget loaders still emit render-miss telemetry; strict mode can be enabled via `window.DOS_DYNAMIC_UI_STRICT`.

## Tests and Gates

- Contract tests:
  - `tests/contract/websocket-contracts.test.ts`
  - `tests/contract/ui-ai-compatibility.contract.test.ts`
- Dynamic UI registry resolvability gate:
  - `pnpm dynamic-ui:loader-resolvability`

## Rollback Procedure

Rollback is safe and isolated; use the smallest rollback that addresses the issue.

### Rollback A — Revert production WS routing (fastest)

1. Revert `/ws` proxy target in `platform/config-center/ops/nginx/dos-platform.conf` back to `platform_gateway`.
2. Reload nginx.

Impact: realtime fanout returns to heartbeat-only behavior; Dynamic UI invalidation events will stop flowing.

### Rollback B — Disable realtime-driven Dynamic UI rerenders

1. Revert the websocket subscription block in `platform/config-center/shared/dynamic-ui/components/dynamic-page-host.component.ts`.

Impact: UI will only refresh widgets on route navigation; websocket connection may still be used for notifications.

### Rollback C — Remove AI widget key registrations

1. Revert AI entries from `platform/config-center/shared/dynamic-ui/registry/widget-key-map.ts`.
2. Revert the `config` setter support from `platform/foundation/ui/shared/ai-panel/ai-panel.component.ts`.

Impact: AI widget keys will render-miss (skipped) again; pages depending on them show the Dynamic UI empty-state.

### Rollback D — Revert websocket event normalization

1. Revert changes in `platform/runtime/websocket/websocket-notification.service.ts`.
2. Confirm that existing consumers do not rely on `data.eventType` normalization.

Impact: legacy consumers may behave as before; dotted event types will not be routed unless the older producers are restored.

