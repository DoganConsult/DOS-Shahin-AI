# Compliance Module — Agent Execution Memory

> This file is the source of truth for the Compliance Module transformation.
> It is maintained by the AI agent during the wave-by-wave refactor.

## Authorization
- User has delegated full sequential execution authority for Waves W0 → W8.
- Agent does NOT pause for per-wave go-ahead.
- Agent does NOT use subagents for this workstream (user preference: trust this agent directly).
- Agent must NEVER `git commit`, `git push`, or deploy without explicit instruction.

## Pre-lock assumptions (flagged for Foundation/Dynamic-UI team confirmation)
1. **Foundation port surface** — assumed shape mirrors `@dos/module-foundation/contracts/v1` (organizations, business-units, departments, positions, locations, committees, audit-trail writer, profiles/roles, lookups, SoD eval). Actual interface verified by reading Foundation's `ports/` and `contracts/`.
2. **Dynamic UI seed contract** — verified from `db/public/migrations/001..005`. Tables `dos.dynamic_ui_modules`, `_module_status`, `_navigation`, `_routes`, `_shells`, `_route_permissions`, `_tenant_overrides`, `_component_registry`. Locked.
3. **`module_config` ownership** — assumed per-module ownership; Compliance owns `compliance_module_config(tenant_id NULL, kind, type, version, payload)`. Tenant overrides go to `dos.dynamic_ui_tenant_overrides` for routing/nav, and to `compliance_module_config` for list/detail/form.
4. **Component-key namespace** — `compliance.<page-key>` (e.g., `compliance.overview`, `compliance.obligations.list`).
5. **Readiness reporting** — every route seeded with honest `RouteReadiness` (READY / PARTIAL / STUB / BLOCKED).
6. **Permissions registration** — Compliance owns its own catalog (`interface/security/compliance.permissions.ts`) and migrates rows into Foundation's `permissions` table via SQL `ON CONFLICT DO NOTHING`.
7. **Audit writer** — assumed Foundation exposes a programmatic writer; if only HTTP, Compliance uses `foundationClient.audit.write()`.
8. **Workflow** — soft dependency; Compliance reads via `WorkflowPort`, will stub if module not present.
9. **AI port** — aligned with Foundation's `ai.port.ts` shape.
10. **Frontend Angular library path** — TBD; W6 spike will determine.

## Wave Status

| Wave | Title | Status |
|---|---|---|
| W0 | Skeleton (rename, dist purge, tsconfig, vitest smoke) | COMPLETE |
| W1 | Bootstrap & router aggregation (mirror Foundation) | COMPLETE |
| W1.5 | Dynamic UI enrollment seeds | COMPLETE |
| W2 | Ports & adapters (foundation, dynamic-ui, audit) | COMPLETE |
| W3 | DB lifecycle (migrations consolidation, tenant seed, testcontainers) | COMPLETE |
| W4 | Permissions & SoD via Foundation port | COMPLETE |
| W5 | Module runtime config & views/presets | COMPLETE |
| W6 | UI self-containment (component registry + pages library) | COMPLETE |
| W7 | Export / realtime / AI endpoints | COMPLETE |
| W8 | Hardening, health, metrics, release | COMPLETE |
| W9 | First per-page route promotion (`/api/controls` real CRUD) | COMPLETE |
| W10 | Second per-page route promotion (`/api/frameworks` real CRUD) | COMPLETE |
| W11 | Obligations sub-vertical on `/api/compliance/obligations` (CRUD + status transition) | COMPLETE |
| W12 | Assessments sub-vertical on `/api/compliance/assessments` (CRUD + status+score transition) | COMPLETE |
| W13 | Requirements sub-vertical on `/api/compliance/requirements` (CRUD + criticality + filters) | COMPLETE |
| W14 | Gaps sub-vertical on `/api/compliance/gaps` (CRUD + status+level transition + audit before/after) | COMPLETE |
| W15 | Attestations vertical on `/api/compliance-attestation` (top-level promotion, CRUD + status PATCH + audit) | COMPLETE |
| W16 | Exceptions sub-vertical on `/api/compliance/exceptions` (CRUD + status PATCH with approver capture + audit) | COMPLETE |
| W17 | Evidence-Links sub-vertical on `/api/compliance/evidence-links` (CRUD + verify PATCH toggling verified_at/verified_by + audit) | COMPLETE |
| W18 | Regulatory-Changes sub-vertical on `/api/compliance/regulatory-changes` (CRUD + status PATCH with assignedTo update + audit) | COMPLETE |
| W19 | Monitoring sub-vertical on `/api/compliance/monitoring` (CRUD + check PATCH setting last/next + status + audit) | COMPLETE |
| W20 | Posture-Scores sub-vertical on `/api/compliance/posture-scores` (immutable snapshots + latest-per-framework + audit) | COMPLETE |
| W21 | Roadmap sub-vertical on `/api/compliance/roadmap` (CRUD + status PATCH with auto actual_date on completed + audit) | COMPLETE |
| W22 | Calendar sub-vertical on `/api/compliance/calendar` (CRUD + status PATCH + date-window filter + audit) | COMPLETE |
| W23 | Programs sub-vertical on `/api/compliance/programs` (CRUD + status PATCH + budget validation + audit) | COMPLETE |
| W24 | Controls-Mapping sub-vertical on `/api/compliance/controls-mapping` (CRUD + test PATCH with effectiveness/last_tested + audit) | COMPLETE |
| W25 | KPIs sub-vertical on `/api/compliance/kpis` (CRUD + value PATCH stamping computed_at + trend + audit) | COMPLETE |
| W26 | Settings sub-vertical on `/api/compliance/settings` (upsert via ON CONFLICT, deactivate via DELETE, scope+isActive filters + audit) | COMPLETE |
| W27 | Attachments sub-vertical on `/api/compliance/attachments` (polymorphic entityType+entityId metadata + create/delete + audit) | COMPLETE |
| W28 | Comments sub-vertical on `/api/compliance/comments` (polymorphic + threading via parentId + resolve PATCH + audit) | COMPLETE |
| W29 | Tags sub-vertical on `/api/compliance/tags` (polymorphic key/value + create/delete + audit) | COMPLETE |
| W30 | Change-Log sub-vertical on `/api/compliance/change-log` (append-only field-change journal + audit) | COMPLETE |
| W31 | External-Mappings sub-vertical on `/api/compliance/external-mappings` (CRUD + sync PATCH stamping last_synced_at + audit) | COMPLETE |
| W32 | Report-Snapshots sub-vertical on `/api/compliance/report-snapshots` (immutable snapshots + expires_at filter + audit) | COMPLETE |
| W33 | AI-Suggestions sub-vertical on `/api/compliance/ai-suggestions` (CRUD + review PATCH stamping reviewer + audit) | COMPLETE |
| W34 | Versions sub-vertical on `/api/compliance/versions` (immutable snapshots + auto-increment version per entity + latest lookup + audit) | COMPLETE |
| W35 | Control-Deficiencies sub-vertical on `/api/compliance/control-deficiencies` (CRUD + status PATCH with closure_notes + severity validation + audit) | COMPLETE |
| W36 | Control-Effectiveness sub-vertical on `/api/compliance/control-effectiveness` (append-only assessments + latest-per-control + assessment_type/rating enums + audit) | COMPLETE |
| W37 | Control-Scope-Tags sub-vertical on `/api/compliance/control-scope-tags` (upsert by (controlId,scope) + sign-off PATCH + delete + audit) | COMPLETE |
| W38 | Control-Test-Schedules sub-vertical on `/api/compliance/control-test-schedules` (CRUD + execution PATCH + frequency/result enums + dueBefore filter + audit) | COMPLETE |
| W39 | Attestation-Campaigns sub-vertical on `/api/compliance/attestation-campaigns` (CRUD + status PATCH + entity_type/status enums + audit) | COMPLETE |
| W40 | Attestation-Records sub-vertical on `/api/compliance/attestation-records` (CRUD + attest PATCH stamping attested_at + remind PATCH + status enum + audit) | COMPLETE |
| W41 | Attestation-Drafts sub-vertical on `/api/compliance/attestation-drafts` (CRUD + review PATCH stamping approved_by/at on approved/rejected + entity_type/status enums + audit) | COMPLETE |
| W42 | CSA-Campaigns sub-vertical on `/api/compliance/csa-campaigns` (CRUD + status PATCH + status enum draft|active|closed|archived + control_ids/respondent_ids JSONB + audit) | COMPLETE |
| W43 | CSA-Responses sub-vertical on `/api/compliance/csa-responses` (append-only POST + list filters + rating enum + audit submit) | COMPLETE |
| W44 | UCF-Controls sub-vertical on `/api/compliance/ucf-controls` (CRUD + lifecycle PATCH + lifecycle_state enum draft|active|deprecated|retired + JSONB evidence/test/exception arrays + ILIKE search + audit) | COMPLETE |
| W45 | Crosswalk-Mappings sub-vertical on `/api/compliance/crosswalk-mappings` (list/get/create/delete + relationship enum equivalent|partial|related|derived_from + confidence [0,1] validation + bad_input/bad_relationship/bad_confidence + audit create/delete) | COMPLETE |
| W46 | SoD-Conflict-Matrix sub-vertical on `/api/compliance/sod-conflict-matrix` (list/get/create/delete + conflict_type enum forbidden|requires_approval|requires_review (default forbidden) + severity enum low|medium|high|critical (default high) + roleA!==roleB guard + audit create/delete) | COMPLETE |
| W47 | Entities sub-vertical on `/api/compliance/entities` (CRUD + status PATCH + entity_type enum subsidiary|business_unit|legal_entity|branch|joint_venture (default subsidiary) + status enum active|inactive|archived (default active) + ILIKE search on name + audit create/status/delete) | COMPLETE |
| W48 | Findings sub-vertical on `/api/compliance/findings` (CRUD + status PATCH stamping closed_at on closed/remediated/rejected + severity enum low|medium|high|critical (default medium) + source enum internal|regulator|audit|self_assessment|monitoring (default internal) + status enum open|in_remediation|remediated|closed|rejected (default open) + identified_by defaults to actorId + control/requirement/gap link + ILIKE search on title + audit create/status/delete) | COMPLETE |
| W49 | Evidence-Files sub-vertical on `/api/compliance/evidence-files` (binary metadata over `<tenant>.evidence_files` with content_hash + storage_uri + size_bytes + retention_until + status enum active|quarantined|expired|deleted + control/requirement/finding link + uploaded_by defaults to actorId + bad_input/bad_size/bad_status guards + ILIKE search on filename + audit create/status/delete) | COMPLETE |
| W50 | Workspaces sub-vertical on `/api/compliance/workspaces` (CRUD + status PATCH + status enum active|inactive|archived (default active) + parent_workspace_id hierarchy + owner_user_id defaults to actorId + bad_input on missing code/name + bad_status enum guard + ILIKE search on name + filter by parentWorkspaceId/ownerUserId + audit create/status/delete) | COMPLETE |
| W51 | Instrument-Structure sub-vertical on `/api/compliance/instrument-structure` (legal text hierarchy `instrument→chapter→article→clause` over `<tenant>.instrument_structure` + node_type enum + parent_node_id integrity (instrument has no parent, others require one) + ordinal + body + language (default `en`) + bad_input/bad_node_type/bad_parent guards + filter by instrumentCode/nodeType/parentNodeId/language + ILIKE search on label + audit create/delete) | COMPLETE |
| W52 | Sectors + Framework-Sector-Applicability dual sub-verticals on `/api/compliance/sectors` and `/api/compliance/framework-sector-applicability` (sector taxonomy with status enum active|inactive + applicability enum mandatory|recommended|optional|not_applicable defaulting to mandatory + bad_input/bad_status/bad_applicability guards + ILIKE search on sector name + filter FSA by frameworkCode/sectorId/applicability + audit sector.create|delete and framework_sector_applicability.create|delete) | COMPLETE |
| W53 | Regulator-Bulletins sub-vertical on `/api/compliance/regulator-bulletins` (CRUD + status PATCH auto-stamping published_at on `published` + severity enum low|medium|high|critical (default medium) + status enum draft|published|superseded|archived (default draft) + bad_input/bad_severity/bad_status guards + filter by regulatorCode/severity/status/publishedSince + ILIKE search on title + audit create/status/delete) | COMPLETE |
| W54 | Submission-Packets sub-vertical on `/api/compliance/submission-packets` (regulator filing bundles over `<tenant>.submission_packets` + status enum draft|under_review|submitted|accepted|rejected|withdrawn (default draft) + status PATCH auto-stamps submitted_at/submitted_by on `submitted` and accepted_at on `accepted` + captures rejection_reason on `rejected` + bad_input on missing regulatorCode/frameworkCode/title + bad_status guard + filter by regulatorCode/frameworkCode/status + ILIKE search on title + audit create/status/delete) | COMPLETE |
| W55 | Bilingual-Content sub-vertical on `/api/compliance/bilingual-content` (per-tenant Arabic/English translations over `<tenant>.bilingual_content` + language enum en|ar (required) + status enum draft|approved|deprecated (default draft) + translator_id captured from actorId + status PATCH auto-stamps approved_by/approved_at on `approved` + bad_input on missing entityType/entityId/fieldKey/content + bad_language/bad_status enum guards + filter by entityType/entityId/fieldKey/language/status + audit create/status/delete) | COMPLETE |
| W56 | Compliance-Universe sub-vertical on `/api/compliance/compliance-universe` (denormalized cross-entity graph over `<tenant>.compliance_universe_nodes` + node_type enum framework|control|obligation|requirement|sector|instrument|gap|finding|regulator|workspace|entity + status enum active|deprecated (default active) + parent_node_id hierarchy + attributes JSONB ({} default) + bad_input on missing nodeType/nodeCode/label + bad_node_type/bad_status enum guards + filter by nodeType/parentNodeId/status + ILIKE search on label OR node_code + audit create/status/delete) | COMPLETE |
| W57 | Compliance-Calculator sub-vertical on `/api/compliance/compliance-calculator` (deterministic posture aggregator over `<tenant>.compliance_calculations` + scope enum framework|control|workspace + score = (satisfied + 0.5*partial)/total*100 rounded 2dp + reads `<tenant>.requirements`/`<tenant>.gaps` for given scopeRef + immutable snapshot rows + open_gaps excludes closed/resolved + GET /latest?scope&scopeRef + bad_input/bad_scope guards + audit run) | COMPLETE |
| W58 | Content-Pack Loader sub-vertical on `/api/compliance/content-pack-loader` (idempotent KSA regulatory pack ingest into `<tenant>.frameworks`/`requirements`/`instrument_structure` with journal in `<tenant>.content_pack_imports` + canonical SHA-256 content hash + ON CONFLICT DO NOTHING per row + same pack_code+content_hash → status `noop` (counts zero) + bad_input on missing packCode/version + audit content_pack.load) | COMPLETE |
| W59 | Drift-Detector sub-vertical on `/api/compliance/drift-detector` (compares supplied baseline frameworks+requirements vs current `<tenant>.frameworks`/`requirements` and snapshots deltas to `<tenant>.drift_records` + entity_type enum framework|requirement + drift_kind enum added|removed|changed + per-row before_value/after_value JSONB + framework key=`code`, requirement key=`frameworkCode::code` + bad_input on missing baseline.packCode/packVersion + audit drift.run) | COMPLETE |
| W60 | Event-Publisher sub-vertical on `/api/compliance/event-publisher` (durable outbox over `<tenant>.event_outbox` + status enum pending|dispatched|failed (default pending) + attempts counter + error_message capture + payload JSONB ({} default) + POST publish writes pending row + POST /dispatch drains FIFO batch (default 50, max 500) invoking optional dispatchHandler then markDispatched/markFailed + bad_input on missing eventType/aggregateType/aggregateId + filter by status/eventType/aggregateId + audit event.publish/event.dispatch) | COMPLETE |
| W61 | SoD-Runtime sub-vertical on `/api/compliance/sod-runtime` (evaluation engine over `<tenant>.sod_evaluations` reading `<tenant>.sod_conflict_matrix` + verdict enum allowed|blocked|requires_approval|requires_review derived from hits (forbidden→blocked, else requires_approval→requires_approval, else requires_review→requires_review, none→allowed) + persists candidate_roles/hits/context as JSONB + bad_input on missing subjectUserId/candidateRoles + filter by subjectUserId/verdict + audit sod.evaluate) | COMPLETE |
| W62 | Findings→Remediation Bridge sub-vertical on `/api/compliance/findings-remediation-bridge` (creates `<tenant>.remediation_actions` row from a `<tenant>.findings` finding + status enum open|in_progress|completed|cancelled (default open) + priority enum low|medium|high|critical (default medium) + POST /from-finding atomically advances source finding open→in_remediation when applicable + PATCH /:id/status auto-stamps completed_at on `completed` + bad_input/bad_priority/bad_status guards + 404 when source finding missing + filter by findingId/status/ownerUserId + audit remediation.action.bridge_from_finding/remediation.action.status) | COMPLETE |
| W63 | Hardening composite-level middlewares (request-id propagation + fixed-window in-memory rate-limit on `/api/compliance`) — accepts inbound `x-request-id` (≤200 chars) or generates `req_<base36-time>_<12-chars>`; echoes via response header + `res.locals.requestId`; rate-limit keyed by tenant+ip+method+path with default 600/min, configurable `windowMs`/`max`/`keyResolver`/`skip`/`now`; emits `x-ratelimit-limit/remaining/reset` headers, returns 429 `rate_limited` with `retry-after`; exposes `prune()`/`size()`; metrics `compliance_request_id_total`/`compliance_rate_limit_allows_total`/`compliance_rate_limit_blocks_total`; bootstrap option `hardening: { enabled, requestId, rateLimit }`, mounted before any sub-router | COMPLETE |
| W64 | Approval-Matrix Runtime sub-vertical on `/api/compliance/approval-matrix-runtime` (deterministic chain resolver over `<tenant>.approval_matrix` writing to `<tenant>.approval_decisions` + outcome enum auto_approved|pending|not_required (auto_approved when no matching rules; not_required when explicit `none` rule matched; pending when ≥1 required/optional step survives threshold filter) + ordered chain by `ordinal` + per-rule `threshold_field`+`threshold_min` numeric gating with finite-number coercion + persists chain[]/context as JSONB + bad_input on missing entityType/entityId/action + bad_outcome guard + filter by entityType/entityId/outcome + audit approval.resolve) | COMPLETE |
| W65 | Outbox-Dispatcher Job sub-vertical on `/api/compliance/outbox-dispatcher-job` (long-lived scheduled drainer for the W60 outbox over `<tenant>.outbox_dispatcher_runs` + status enum idle\|running\|stopped + per-tenant lock token + configurable intervalMs (default 5000, min 100) + batch (1..500) + journals each cycle (started/finished, scanned/dispatched/failed) + delegates to `dispatchPendingEvents` from W60 + handle exposes start/stop/runOnce/status/lastRun + GET list (status filter) + POST /run-once (custom lockToken accepted) + permission gates `event.dispatcher.read|write` + bad_schema guard + audit `event.dispatcher.run`) | COMPLETE |
| W66 | Retry-Backoff Policy sub-vertical on `/api/compliance/retry-backoff-policy` (re-queues `failed` rows from `<tenant>.event_outbox` back to `pending` once exponential backoff elapses + journals every decision to `<tenant>.retry_decisions` + action enum requeued\|skipped_too_soon\|skipped_exhausted\|dropped + policy `{baseMs:30000, factor:2, maxDelayMs:3_600_000, maxAttempts:8, dropOnExhausted:false}` defaults + `computeBackoffMs(attempts, policy)` helper + injectable `now()` for tests + GET list (eventId/action filters) + POST /run + permission gates `event.retry.read|write` + bad_schema/bad_action guards + audit `event.retry.run`) | COMPLETE |
| W69 | Notification-Dispatcher sub-vertical on `/api/compliance/notification-dispatcher` (durable per-tenant queue over `<tenant>.notifications` + channel enum email\|in_app\|sms\|webhook + status enum queued\|sent\|failed\|cancelled (default queued) + POST enqueues queued + POST /dispatch drains queued via injected handler stamping sent_at on success / last_error+attempts on failure (single-worker, FIFO by created_at) + POST /:id/cancel allowed only from queued\|failed (409 bad_state otherwise) + bad_input on missing recipientUserId/subject + bad_channel guard + filter by status/channel/recipientUserId + permission gates `notification.read|write` + audit `notification.enqueue|dispatch|cancel`) | COMPLETE |
| W70 | Workflow-Runtime sub-vertical on `/api/compliance/workflow-runtime` (declarative state-machine engine over `<tenant>.workflow_definitions` (JSONB definition: initial+states[]+transitions[{from,event,to,requiresPermission?}]) + `<tenant>.workflow_instances` (workflow_code, definition_id, entity_type, entity_id, current_state, status active\|terminated, context JSONB) + `<tenant>.workflow_transitions` (audit history) + POST /definitions registers definition (validates initial state in states[] + transition refs known states) + POST /instances starts at definition.initial + POST /:id/trigger atomically applies (current_state, event) rule, merges context JSONB via `||`, journals to workflow_transitions, enforces optional rule.requiresPermission against caller-supplied permissions[] + POST /:id/terminate idempotent + GET /:id/transitions history + bad_input/bad_definition/not_found/bad_state/no_transition/forbidden guards + permission gates `workflow.read|write` + audit `workflow.definition.create|instance.start|trigger|terminate`) | COMPLETE |
| W71 | Outbox-Archive sub-vertical on `/api/compliance/outbox-archive` (copies `dispatched` rows from `<tenant>.event_outbox` older than `olderThanDays` (default 30, must be > 0) into `<tenant>.event_outbox_archive` via `INSERT … SELECT` with `ON CONFLICT (event_id) DO NOTHING` then DELETEs them from the live outbox + journals each run to `<tenant>.event_outbox_archive_runs` with cutoff_iso/scanned/archived/deleted/error counters + run status enum completed\|failed\|partial (partial when deleted<archived; failed when scan/copy throws) + dryRun mode scans without writing + injectable `now()` for tests + GET list (status filter) + POST /run + bad_input on olderThanDays<=0 + permission gates `event.archive.read|write` + audit `event.archive.run`/`dry_run`/`failed`) | COMPLETE |
| W72 | Schema-Migration-Tracker sub-vertical on `/api/compliance/schema-migration-tracker` (per-tenant DDL migration journal over `<tenant>.schema_migrations` + status enum applied\|failed\|rolled_back (default applied) + caller-supplied `migrationId` (stable code) + monotonic `version` (must be > 0) + SHA-256 `checksum` (caller-computed) + idempotent re-record when same migrationId+checksum + 409 `bad_checksum` on checksum drift for an `applied` row + POST /:id/rollback marks rolled_back (idempotent; rejects from `failed` with 409 bad_state) + GET list (status, sinceVersion filters) returns `latestVersion = MAX(version) WHERE status=applied` + GET /:id fetch + bad_input/bad_status/bad_checksum/bad_state/not_found guards + permission gates `schema.migration.read|write` + audit `schema.migration.record|rollback`) | COMPLETE |
| W73 | Audit-Log-Stream sub-vertical on `/api/compliance/audit-log-stream` (read-only paginated stream over `<tenant>.audit_events` + cursor-based pagination using base64url-encoded `{ts,id}` tuple ordered `(occurred_at DESC, event_id DESC)` + filters module/action/actorId/resourceType/resourceId/occurredFrom/occurredTo + GET /count returns total under same filter set + bad_schema/bad_cursor guards + permission gate `audit.read` (read-only — no write surface) + nextCursor null when end of stream + limit clamp 1..500 default 100) | COMPLETE |
| W79 | Rate-Limit-Policies sub-vertical on `/api/compliance/rate-limit-policies*` (per-tenant fixed-window rate limit policies + counter ledger over `<tenant>.rate_limit_policies` PK policy_code + subject_kind enum user\|api_key\|ip\|global + window_seconds INT >0 + max_requests INT >0 + metadata JSONB and `<tenant>.rate_limit_counters` PK (policy_code,subject_id,window_started_at) + `windowStartFor(now,windowSeconds)` floors to `floor(now/window)*window` + `consume(policy,subject,n=1)` upserts via `ON CONFLICT … DO UPDATE SET counter = counter + EXCLUDED.counter` returning `{allowed,counter,max,resetAt,windowStartedAt}` (allowed = counter<=max; HTTP 200 when allowed, 429 when over) + `check()` read-only (allowed = counter<max) + `purgeExpiredCounters(olderThanWindows=1)` joins counter→policy and deletes via `window_started_at + window_seconds*INTERVAL '1 second' * $1 < $2` + GET /rate-limit-policies (subjectKind filter) + GET /:code + POST upsert + DELETE + POST /:code/check + POST /:code/consume (HTTP 429 on breach) + POST /purge + bad_input on missing policyCode/subjectId or window/max/amount<=0 + bad_subject_kind enum guard + permission gates `rate_limit.read\|write\|consume` + audit `rate_limit.upsert\|delete\|consume\|purge` + `RATE_LIMIT_SUBJECT_KINDS` exported) | COMPLETE |
| W78 | API-Keys sub-vertical on `/api/compliance/api-keys*` (per-tenant API key issuance/verification/revocation over `<tenant>.api_keys` PK key_id + key_prefix (first 8 chars indexed for prefix lookup) + key_hash (SHA-256 hex; plaintext NEVER stored) + label TEXT + scopes JSONB string[] + status enum active\|revoked + expires_at TIMESTAMPTZ NULL + last_used_at + revoked_at/by + `issueKey()` returns plaintext exactly once via `dos_<48 hex>` (or test-supplied override) + `verifyKey(plaintext)` does prefix lookup, hash compare, status/expiry check, stamps last_used_at on hit, returns reason `not_found\|hash_mismatch\|revoked\|expired\|ok` + `revokeKey()` is idempotent (already-revoked returns row unchanged) + GET /api-keys (status filter) + GET /api-keys/:id + POST /api-keys (issues plaintext) + POST /api-keys/:id/revoke + POST /api-keys/verify + bad_input on missing label or plaintextOverride <12 chars + permission gates `api_key.read\|write\|verify` + audit `api_key.issue\|revoke\|verify` + `API_KEY_STATUSES`/`API_KEY_VERIFY_REASONS` exported) | COMPLETE |
| W77 | Feature-Flags sub-vertical on `/api/compliance/feature-flags*` (per-tenant feature toggle store over `<tenant>.feature_flags` PK flag_code + enabled BOOL + rollout_percent INT 0..100 + allowed_users/denied_users JSONB string[] + metadata JSONB + `evaluate(flagCode,userId)` ordered checks: missing→`unknown`; enabled=false→`disabled`; deniedUsers→`denied`; allowedUsers→`allowed`; rollout<=0→`rollout_zero`; rollout>=100→`rollout_full`; else deterministic `bucket(userId,flagCode)=djb2(userId+'\|'+flagCode)%100<rollout`→`rollout_in`/`rollout_out` + GET /feature-flags (enabled filter) + GET /feature-flags/:code + POST /feature-flags upsert (`ON CONFLICT (flag_code) DO UPDATE`) + DELETE /feature-flags/:code + GET /feature-flags/:code/evaluate (?userId override or context user) + bad_input on missing flagCode or rolloutPercent out of [0..100] + permission gates `feature_flag.read\|write` + audit `feature_flag.upsert\|delete` + `FEATURE_FLAG_REASONS` constant exported) | COMPLETE |
| W76 | Idempotency-Keys sub-vertical on `/api/compliance/idempotency-keys*` (per-tenant idempotent-request store over `<tenant>.idempotency_keys` PK (scope,key) + scope/key TEXT + request_hash TEXT + response_status INT + response_body JSONB + ttl_seconds INT (default 86400) + `recordResult()` upserts on first call returning {stored:true} else short-circuits returning cached row when requestHash matches OR throws `bad_conflict` when requestHash differs + `lookup()` returns row when present and unexpired + `isExpired()` checks `created_at + ttl_seconds < now()` + `purgeExpired()` deletes expired rows via `created_at + (ttl_seconds * INTERVAL '1 second') < $1` + GET /idempotency-keys (scope filter) + GET /idempotency-keys/:scope/:key + POST /idempotency-keys + POST /idempotency-keys/purge + bad_input on missing scope/key/requestHash/responseStatus or ttlSeconds<=0 + permission gates `idempotency.read\|write` + audit `idempotency.record\|purge`) | COMPLETE |
| W75 | Webhook-Subscriptions sub-vertical on `/api/compliance/webhook-subscriptions*` (per-tenant subscription registry `<tenant>.webhook_subscriptions` + delivery journal `<tenant>.webhook_deliveries` + subscription status enum active\|paused\|revoked + delivery status enum succeeded\|failed + eventTypes JSONB with `*` wildcard match + optional secret + URL_RE `^https?://` validation + `dispatchEvent()` resolves active subs whose eventTypes include exact event or `*`, invokes host transport (return number → response_status; throw → failed; non-2xx → failed), records delivery row with response_status/duration_ms/error + revoked→other = bad_state + GET /webhook-subscriptions (status/eventType `@>` JSONB filter) + GET /webhook-subscriptions/:id + POST /webhook-subscriptions + PATCH /webhook-subscriptions/:id/status + POST /webhook-subscriptions/dispatch + GET /webhook-deliveries (subscriptionId/status/eventType filters) + bad_input on missing targetUrl/eventTypes/eventType + permission gates `webhook.read\|write` + audit `webhook.subscribe\|status_change\|dispatch`) | COMPLETE |
| W74 | Scheduled-Jobs-Runner sub-vertical on `/api/compliance/scheduled-jobs*` (per-tenant job catalog `<tenant>.scheduled_jobs` upserted by stable `job_code` with `interval_seconds` (must be > 0), `enabled` flag, cursor `last_run_at`+`last_status` + execution journal `<tenant>.scheduled_job_runs` with run status enum `succeeded\|failed\|skipped` and duration_ms + POST /scheduled-jobs upserts via `ON CONFLICT (job_code) DO UPDATE` + POST /scheduled-jobs-runner/run picks due jobs (last_run_at+interval ≤ now or null), invokes host-supplied per-job handler keyed by job_code, journals each run, stamps job last_run_at/last_status; missing handler → status=skipped+`error='no handler registered'` + GET /scheduled-jobs (enabled filter) + GET /scheduled-jobs/:code + GET /scheduled-jobs-runs (jobCode/status filters) + bad_input on missing jobCode or intervalSeconds<=0 + permission gates `scheduled_jobs.read\|write` + audit `scheduled_jobs.upsert\|run`) | COMPLETE |
| W68 | Retention-Policy sub-vertical on `/api/compliance/retention-policy` (schedule-driven purge over `<tenant>.retention_policies` + journal `<tenant>.retention_runs` + run status enum completed\|failed\|partial + mode enum soft\|hard (soft = UPDATE status='retention_archived'+retention_archived_at=NOW(); hard = DELETE) + closed-set `ENTITY_TABLE` mapping for audit_events\|evidence_files\|report_snapshots\|change_log\|retry_decisions\|outbox_dispatcher_runs\|event_dead_letter + skipped+reason on unsupported entity_type or `retain_days <= 0` + `planEntity()` helper + `dryRun` mode + injectable `now()` for tests + GET list (status filter) + POST /run (entityTypes filter, dryRun) + permission gates `retention.read|write` + bad_schema guard + audit `retention.run`/`retention.dry_run`) | COMPLETE |
| W67 | Dead-Letter-Queue sub-vertical on `/api/compliance/dead-letter-queue` (terminal sink over `<tenant>.event_dead_letter` + status enum open\|replayed\|archived (default open) + POST /from-event copies an outbox row into the DLQ + POST /:id/replay re-publishes a fresh `<tenant>.event_outbox` row (status=pending, attempts=0) and stamps DLQ replayed_at/replayed_by/new_event_id + POST /:id/archive idempotent terminal mark + bad_state on replay of already-replayed/archived + 404 when source event/dlq missing + filters status/eventType/aggregateId + permission gates `event.dlq.read|write` + audit `event.dlq.move`/`replay`/`archive`) | COMPLETE |

## Gate Evidence Log
*(filled per wave)*

### W79 Gate Evidence — COMPLETE
- [x] `application/rate-limit-policies/rate-limit-policies.service.ts` — `upsertPolicy`/`getPolicy`/`listPolicies`/`deletePolicy`/`consume`/`check`/`purgeExpiredCounters`/`windowStartFor` over `<tenant_schema>.rate_limit_policies` PK policy_code (subject_kind enum `user|api_key|ip|global`, window_seconds INT >0, max_requests INT >0, metadata JSONB) and `<tenant_schema>.rate_limit_counters` PK (policy_code,subject_id,window_started_at); `windowStartFor(now,windowSeconds)` floors to `floor(now/window)*window`; `consume()` upserts via `ON CONFLICT … DO UPDATE SET counter = counter + EXCLUDED.counter` returning `{allowed,counter,max,resetAt,windowStartedAt}`; `check()` read-only; `purgeExpiredCounters(olderThanWindows=1)` joins counters↔policies and deletes via `c.window_started_at + (p.window_seconds * INTERVAL '1 second') * $1 < $2`; `bad_input`/`bad_subject_kind`/`bad_schema`/`not_found` guards; `RATE_LIMIT_SUBJECT_KINDS` exported
- [x] `interface/http/rate-limit-policies.routes.ts` — sub-router (GET /rate-limit-policies (subjectKind filter), GET /:code, POST /rate-limit-policies (upsert), DELETE /:code, POST /:code/check, POST /:code/consume (200 allowed / 429 over), POST /purge); permission gates `rate_limit.read|write|consume`; audit `rate_limit.upsert`/`delete`/`consume`/`purge`
- [x] `bootstrap.ts` — `rateLimitPoliciesDeps?: RateLimitPoliciesRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types (with `upsertPolicy as upsertRateLimitPolicy`/`consume as consumeRateLimit`/`check as checkRateLimit`/`windowStartFor as rateLimitWindowStartFor`/etc. re-aliases to avoid name collisions)
- [x] `tests/integration/rate-limit-policies-vertical.test.mjs` — **15/15** (RATE_LIMIT_SUBJECT_KINDS exposed; rateLimitWindowStartFor floors; GET permission gate; POST permission gate; POST missing policyCode=400 bad_input; POST bad subjectKind=400 bad_subject_kind; POST windowSeconds<=0=400 bad_input; POST upserts; consume increments counter and returns 200 when allowed; consume returns 429 when exceeded; consume permission gate `rate_limit.consume`; check is read-only; check unknown=404; DELETE removes (GET 404 after); purge removes expired counters)
- [x] Full suite — **726/726 pass**

### W78 Gate Evidence — COMPLETE
- [x] `application/api-keys/api-keys.service.ts` — `issueKey`/`getKey`/`listKeys`/`verifyKey`/`revokeKey`/`hashPlaintext`/`generatePlaintext`/`generateKeyId` over `<tenant_schema>.api_keys`; SHA-256 key_hash, plaintext returned ONCE; verifyKey reasons `not_found|hash_mismatch|revoked|expired|ok` with last_used_at stamping on hit; revokeKey idempotent; `bad_input`/`bad_schema`/`not_found` guards; `API_KEY_STATUSES`/`API_KEY_VERIFY_REASONS` exported
- [x] `interface/http/api-keys.routes.ts` — sub-router (GET /api-keys, GET /api-keys/:id, POST /api-keys (issue), POST /api-keys/:id/revoke, POST /api-keys/verify); permission gates `api_key.read|write|verify`; audit `api_key.issue`/`revoke`/`verify`
- [x] `bootstrap.ts` — `apiKeysDeps?: ApiKeysRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types (with `issueKey as issueApiKey`/`verifyKey as verifyApiKey`/`hashPlaintext as hashApiKeyPlaintext`/etc. re-aliases to avoid name collisions)
- [x] `tests/integration/api-keys-vertical.test.mjs` — **14/14** (statuses+reasons exposed; hash deterministic; GET permission gate; POST permission gate; POST missing label=400 bad_input; POST issues plaintext; verify ok stamps last_used_at; verify wrong=not_found; verify after revoke=revoked; revoke idempotent; revoke unknown=404; GET /:id 404; GET list status filter; verify permission gate)
- [x] Full suite — **711/711 pass**

### W77 Gate Evidence — COMPLETE
- [x] `application/feature-flags/feature-flags.service.ts` — `upsertFlag`/`getFlag`/`listFlags`/`deleteFlag`/`evaluate`/`bucket` over `<tenant_schema>.feature_flags` PK flag_code; `evaluate(flagCode,userId)` ordered checks `unknown→disabled→denied→allowed→rollout_zero→rollout_full→rollout_in/rollout_out` using deterministic `bucket=djb2(userId+'|'+flagCode)%100<rolloutPercent`; `bad_input`/`bad_schema` guards; `FEATURE_FLAG_REASONS` constant exported
- [x] `interface/http/feature-flags.routes.ts` — sub-router (GET /feature-flags, GET /feature-flags/:code, POST /feature-flags upsert, DELETE /feature-flags/:code, GET /feature-flags/:code/evaluate); permission gates `feature_flag.read|write`; audit `feature_flag.upsert`/`feature_flag.delete`
- [x] `bootstrap.ts` — `featureFlagsDeps?: FeatureFlagsRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types (with `upsertFlag as upsertFeatureFlag`/`evaluate as evaluateFeatureFlag`/`bucket as featureFlagBucket`/etc. re-aliases to avoid name collisions)
- [x] `tests/integration/feature-flags-vertical.test.mjs` — **16/16** (FEATURE_FLAG_REASONS exposed; featureFlagBucket determinism; GET permission gate; POST permission gate; POST missing flagCode=400 bad_input; POST rolloutPercent=150=400 bad_input; POST upsert 201; evaluate unknown; evaluate disabled; evaluate denied; evaluate allowed (rollout=0 but in allowedUsers); evaluate rollout_zero; evaluate rollout_full; evaluate rollout_in vs rollout_out matches bucket; DELETE 204; DELETE missing 404)
- [x] Full suite — **697/697 pass**

### W76 Gate Evidence — COMPLETE
- [x] `application/idempotency-keys/idempotency-keys.service.ts` — `recordResult`/`lookup`/`isExpired`/`purgeExpired`/`listKeys` over `<tenant_schema>.idempotency_keys` PK (scope,key); ttl_seconds default 86400; recordResult upserts on first call returning `{stored:true}`, else short-circuits returning cached row when requestHash matches OR throws `bad_conflict`; purgeExpired removes via `created_at + (ttl_seconds * INTERVAL '1 second') < $1`; `bad_input`/`bad_conflict`/`bad_schema` guards
- [x] `interface/http/idempotency-keys.routes.ts` — sub-router (GET /idempotency-keys, GET /idempotency-keys/:scope/:key, POST /idempotency-keys, POST /idempotency-keys/purge); permission gates `idempotency.read|write`; audit `idempotency.record`/`idempotency.purge`
- [x] `bootstrap.ts` — `idempotencyKeysDeps?: IdempotencyKeysRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types (with `recordResult as recordIdempotencyResult`/`lookup as lookupIdempotencyKey`/etc. re-aliases to avoid name collisions)
- [x] `tests/integration/idempotency-keys-vertical.test.mjs` — **13/13** (isIdempotencyExpired ttl true/false; GET permission gate; POST permission gate; POST missing scope=400 bad_input; POST ttlSeconds<=0=400; POST stores first time stored:true; POST same hash=cached stored:false; POST different hash=409 bad_conflict; GET /:scope/:key 404; GET /:scope/:key returns row+responseBody; GET list scope filter; POST /purge removes expired; POST /purge permission gate)
- [x] Full suite — **681/681 pass**

### W75 Gate Evidence — COMPLETE
- [x] `application/webhook-subscriptions/webhook-subscriptions.service.ts` — `createSubscription`/`getSubscription`/`listSubscriptions`/`changeStatus`/`dispatchEvent`/`listDeliveries` over `<tenant_schema>.webhook_subscriptions` + `webhook_deliveries`; subscription status enum `active|paused|revoked`; delivery status enum `succeeded|failed`; URL_RE `^https?://` validation; eventTypes JSONB with `*` wildcard; revoked→other = bad_state; transport return number → response_status; throw → failed; non-2xx → failed; `bad_input`/`bad_status`/`bad_state`/`bad_schema`/`not_found` guards
- [x] `interface/http/webhook-subscriptions.routes.ts` — sub-router (GET /webhook-subscriptions, GET /webhook-subscriptions/:id, POST /webhook-subscriptions, PATCH /webhook-subscriptions/:id/status, POST /webhook-subscriptions/dispatch, GET /webhook-deliveries); permission gates `webhook.read|write`; audit `webhook.subscribe`/`webhook.status_change`/`webhook.dispatch`; transport carried via context
- [x] `bootstrap.ts` — `webhookSubscriptionsDeps?: WebhookSubscriptionsRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types (with `createSubscription as createWebhookSubscription`/`dispatchEvent as dispatchWebhookEvent`/etc. re-aliases to avoid name collisions)
- [x] `tests/integration/webhook-subscriptions-vertical.test.mjs` — **14/14** (GET permission gate; POST permission gate; POST bad targetUrl=400 bad_input; POST empty eventTypes=400 bad_input; POST creates active; PATCH revoked→active=409 bad_state; POST /dispatch wildcard transport=200 succeeded; POST /dispatch transport throw=failed; POST /dispatch no match=matched=0; POST /dispatch non-2xx=failed; POST /dispatch missing eventType=400 bad_input; GET /:id 404; GET /webhook-deliveries; GET /webhook-deliveries permission gate)
- [x] Full suite — **668/668 pass**

### W74 Gate Evidence — COMPLETE
- [x] `application/scheduled-jobs-runner/scheduled-jobs-runner.service.ts` — `upsertJob`/`getJob`/`listJobs`/`listJobRuns`/`runDue`/`isDue` over `<tenant_schema>.scheduled_jobs` + `scheduled_job_runs`; run status enum `succeeded|failed|skipped`; injectable `now()` clock; `bad_input`/`bad_schema` guards; `SCHEDULED_JOB_RUN_STATUSES` exported
- [x] `interface/http/scheduled-jobs-runner.routes.ts` — sub-router (GET /scheduled-jobs, GET /scheduled-jobs/:code, POST /scheduled-jobs, GET /scheduled-jobs-runs, POST /scheduled-jobs-runner/run); permission gates `scheduled_jobs.read|write`; audit `scheduled_jobs.upsert`/`scheduled_jobs.run`; per-job handlers carried via context
- [x] `bootstrap.ts` — `scheduledJobsRunnerDeps?: ScheduledJobsRunnerRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types + constants (with `upsertJob as upsertScheduledJob`/`runDue as runDueScheduledJobs`/etc. re-aliases to avoid name collisions)
- [x] `tests/integration/scheduled-jobs-runner-vertical.test.mjs` — **15/15** (statuses constant; isDue never-run/disabled/within-interval; GET permission gate; POST permission gate; POST missing jobCode=400 bad_input; POST intervalSeconds<=0=400 bad_input; POST upserts; POST upsert updates intervalSeconds; POST /run handler succeeded; POST /run handler throw=failed; POST /run no handler=skipped; GET /:code 404; GET runs status filter)
- [x] Full suite — **654/654 pass**

### W73 Gate Evidence — COMPLETE
- [x] `application/audit-log-stream/audit-log-stream.service.ts` — `listAuditEvents`/`countAuditEvents`/`encodeCursor`/`decodeCursor` over `<tenant_schema>.audit_events`; cursor base64url JSON `{ts,id}`; order `(occurred_at DESC, event_id DESC)`; filters module/action/actorId/resourceType/resourceId/occurredFrom/occurredTo; bad_schema/bad_cursor guards
- [x] `interface/http/audit-log-stream.routes.ts` — sub-router (GET, GET /count); permission gate `audit.read` (read-only — no write surface)
- [x] `bootstrap.ts` — `auditLogStreamDeps?: AuditLogStreamRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types (with `encodeCursor as encodeAuditCursor`/`decodeCursor as decodeAuditCursor`/`StreamCursor as AuditStreamCursor` re-aliases)
- [x] `tests/integration/audit-log-stream-vertical.test.mjs` — **11/11** (cursor round-trip; bad cursor throws; GET permission gate; DESC order; module filter; actorId+action filter; cursor pagination across 2 pages; bad cursor=400; occurredFrom/occurredTo window; /count total; /count permission gate)
- [x] Full suite — **639/639 pass**

### W69 Gate Evidence — COMPLETE
- [x] `application/notification-dispatcher/notification-dispatcher.service.ts` — `enqueueNotification`/`listNotifications`/`getNotification`/`cancelNotification`/`dispatchQueued`/`markSent`/`markFailed` over `<tenant_schema>.notifications`; channel enum `email|in_app|sms|webhook`; status enum `queued|sent|failed|cancelled`; `bad_input`/`bad_channel`/`not_found`/`bad_state`/`bad_schema` guards; `NOTIFICATION_CHANNELS`/`NOTIFICATION_STATUSES` exported
- [x] `interface/http/notification-dispatcher.routes.ts` — sub-router (GET, GET /:id, POST, POST /dispatch, POST /:id/cancel); permission gates `notification.read|write`; audit `notification.enqueue`/`notification.dispatch`/`notification.cancel`
- [x] `bootstrap.ts` — `notificationDispatcherDeps?: NotificationDispatcherRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types + constants (with `EnqueueInput as EnqueueNotificationInput`/`DispatchInput as DispatchNotificationsInput`/etc. re-aliases to avoid name collisions)
- [x] `tests/integration/notification-dispatcher-vertical.test.mjs` — **13/13** (channels+statuses constants; GET permission gate; POST permission gate; POST missing recipientUserId=400 bad_input; POST bad channel=400 bad_channel; POST enqueues queued; POST /dispatch sends via handler; POST /dispatch failures→failed+attempts; POST /:id/cancel from queued; POST /:id/cancel on sent=409 bad_state; POST /:id/cancel unknown=404; GET list filters status/channel/recipientUserId; GET /:id 404)
- [x] Full suite — **595/595 pass**

### W68 Gate Evidence — COMPLETE
- [x] `application/retention-policy/retention-policy.service.ts` — `runRetention`/`listRetentionRuns`/`planEntity`/`isSupportedEntityType` over `<tenant_schema>.retention_policies` + `<tenant_schema>.retention_runs`; mode enum `soft|hard`; run status enum `completed|failed|partial`; closed-set `ENTITY_TABLE` map (audit_events, evidence_files, report_snapshots, change_log, retry_decisions, outbox_dispatcher_runs, event_dead_letter); skipped+reason for unsupported entity_type / `retain_days <= 0`; `dryRun` mode; injectable `now()` for tests; `bad_schema`/`bad_status` guards
- [x] `interface/http/retention-policy.routes.ts` — sub-router (GET, POST /run); permission gates `retention.read|write`; audit `retention.run`/`retention.dry_run`
- [x] `bootstrap.ts` — `retentionPolicyDeps?: RetentionPolicyRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types + `RETENTION_SUPPORTED_ENTITIES`/`RETENTION_RUN_STATUSES`/`RETENTION_MODES` constants + `ListRunsInput as RetentionListRunsInput` re-alias
- [x] `tests/integration/retention-policy-vertical.test.mjs` — **12/12** (isSupportedEntityType + supported list; GET permission gate denies; POST /run permission gate denies; POST empty rules=completed/0; POST hard delete reduces table; POST soft archives; dryRun scans without writing; unsupported entity_type=skipped+reason; retain_days≤0=skipped+reason; entityTypes filter restricts to subset; partial when scan fails; GET list DESC + status filter)
- [x] Full suite — **582/582 pass**

### W67 Gate Evidence — COMPLETE
- [x] `application/dead-letter-queue/dead-letter-queue.service.ts` — `listDlq`/`getDlq`/`moveToDlq`/`replayDlq`/`archiveDlq` over `<tenant_schema>.event_dead_letter`; status enum `open|replayed|archived`; replay creates new pending outbox row and stamps source DLQ replayed_at/replayed_by/new_event_id; `bad_input`/`bad_state`/`not_found`/`bad_schema` guards; `DLQ_STATUSES` exported
- [x] `interface/http/dead-letter-queue.routes.ts` — sub-router (GET, GET /:id, POST /from-event, POST /:id/replay, POST /:id/archive); permission gates `event.dlq.read|write`; audit `event.dlq.move`/`event.dlq.replay`/`event.dlq.archive`
- [x] `bootstrap.ts` — `deadLetterQueueDeps?: DeadLetterQueueRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types + `DLQ_STATUSES` constant
- [x] `tests/integration/dead-letter-queue-vertical.test.mjs` — **11/11** (DLQ_STATUSES enum; GET permission gate; POST permission gate; POST missing eventId=400; POST unknown eventId=404; POST copies into DLQ as open with optional errorMessage; POST replay creates new outbox + stamps DLQ; POST replay on replayed=409 bad_state; POST archive idempotent; GET /:id 404; GET list status filter + total count)
- [x] Full suite — **570/570 pass**

### W66 Gate Evidence — COMPLETE
- [x] `application/retry-backoff-policy/retry-backoff-policy.service.ts` — `computeBackoffMs`/`planRetries`/`listRetryDecisions` over `<tenant_schema>.retry_decisions`; reads `failed` rows from `<tenant>.event_outbox`; action enum `requeued|skipped_too_soon|skipped_exhausted|dropped`; policy `{baseMs,factor,maxDelayMs,maxAttempts,dropOnExhausted}`; `bad_schema`/`bad_action` guards
- [x] `interface/http/retry-backoff-policy.routes.ts` — sub-router (GET, POST /run); permission gates `event.retry.read|write`; audit `event.retry.run`
- [x] `bootstrap.ts` — `retryBackoffPolicyDeps?: RetryBackoffPolicyRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types + `computeBackoffMs` helper
- [x] `tests/integration/retry-backoff-policy-vertical.test.mjs` — **11/11** (computeBackoffMs base/factor/cap/clamp; GET permission gate; POST /run permission gate; POST empty=scanned 0; old event past delay=requeued + outbox flipped to pending; fresh event=skipped_too_soon; attempts≥maxAttempts=skipped_exhausted; dropOnExhausted=true=dropped + outbox marker; GET filter by action; bad_schema rejected; injectable now() controls window)
- [x] Full suite — **559/559 pass**

### W65 Gate Evidence — COMPLETE
- [x] `application/outbox-dispatcher-job/outbox-dispatcher-job.service.ts` — `listRuns`/`executeRun`/`createDispatcherJob` over `<tenant_schema>.outbox_dispatcher_runs`; status enum `idle|running|stopped`; per-tenant lock token; delegates draining to W60 `dispatchPendingEvents`; handle `start()`/`stop()`/`runOnce()`/`status()`/`lastRun()`; `bad_schema` guard at construction
- [x] `interface/http/outbox-dispatcher-job.routes.ts` — sub-router (GET, POST /run-once); permission gates `event.dispatcher.read|write`; audit `event.dispatcher.run`
- [x] `bootstrap.ts` — `outboxDispatcherJobDeps?: OutboxDispatcherJobRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types + `createDispatcherJob` helper
- [x] `tests/integration/outbox-dispatcher-job-vertical.test.mjs` — **11/11** (createDispatcherJob bad_schema; handle idle+lastRun null; GET permission gate denies; POST permission gate denies; POST run-once empty=idle 0/0/0; POST run-once dispatches all pending; POST captures handler failures as failed; custom lockToken accepted; GET list DESC order; GET filter by status; runOnce executes one cycle)
- [x] Full suite — **548/548 pass**

### W64 Gate Evidence — COMPLETE
- [x] `application/approval-matrix-runtime/approval-matrix-runtime.service.ts` — `listDecisions`/`getDecision`/`resolveApprovalChain`/`buildChain` over `<tenant_schema>.approval_decisions`; outcome enum `auto_approved|pending|not_required`; reads `approval_matrix` for the entity-action pair; threshold gating with finite-number coercion; `bad_input`/`bad_outcome` guards
- [x] `interface/http/approval-matrix-runtime.routes.ts` — sub-router (GET, GET /:id, POST /resolve); permission gates `approval.decision.read|write`; audit `approval.resolve`
- [x] `bootstrap.ts` — `approvalMatrixRuntimeDeps?: ApprovalMatrixRuntimeRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types + `buildChain` helper
- [x] `tests/integration/approval-matrix-runtime-vertical.test.mjs` — **10/10** (buildChain empty=auto_approved; none rule=not_required; ordered chain + threshold filter; GET empty; POST resolve no rules=auto_approved+audit; required rules=pending; threshold not met filters step; explicit none=not_required; missing required=bad_input; GET /:id 404 + outcome filter + permission gate denies write 403)
- [x] Full suite — **537/537 pass**

### W63 Gate Evidence — COMPLETE
- [x] `application/hardening/hardening.middleware.ts` — `requestIdMiddleware()` + `rateLimitMiddleware()` Express middleware factories; bounded fixed-window limiter; injectable clock; `prune()`/`size()`
- [x] `bootstrap.ts` — `hardening?: { enabled?: boolean; requestId?: RequestIdOptions; rateLimit?: RateLimitOptions }` option; both middlewares mounted at top of `/api/compliance` composite when enabled (default `enabled !== false`)
- [x] `tsconfig.json` includes the new TS file; clean rebuild green
- [x] `index.ts` exports `requestIdMiddleware`/`rateLimitMiddleware` + types
- [x] `tests/integration/hardening-vertical.test.mjs` — **10/10** (requestId echoed; missing header generated; oversized header replaced; rate-limit allows under threshold; 429 over threshold with retry-after; window reset clears counter; skip predicate bypasses; prune drops expired buckets; bootstrap mounts both on `/api/compliance` with 429 enforcement; disabled when option absent)
- [x] Full suite — **527/527 pass**

### W62 Gate Evidence — COMPLETE
- [x] `application/findings-remediation-bridge/findings-remediation-bridge.service.ts` — `listRemediationActions`/`getRemediationAction`/`createFromFinding`/`updateActionStatus` over `<tenant_schema>.remediation_actions`; status enum `open|in_progress|completed|cancelled`; priority enum `low|medium|high|critical`; reads `<tenant>.findings` for source row; advances `open→in_remediation`; `bad_input`/`bad_priority`/`bad_status`/`not_found` guards
- [x] `interface/http/findings-remediation-bridge.routes.ts` — sub-router (GET, GET /:id, POST /from-finding, PATCH /:id/status); permission gates `remediation.action.read|write`; audit `remediation.action.bridge_from_finding`/`remediation.action.status`
- [x] `bootstrap.ts` — `findingsRemediationBridgeDeps?: FindingsRemediationBridgeRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/findings-remediation-bridge-vertical.test.mjs` — **10/10** (GET empty; POST /from-finding open finding=advanced+audit; in_remediation finding=not advanced; missing finding=404; bad_input; bad_priority; PATCH completed stamps completed_at+audit; PATCH bad_status; GET /:id 404 + status filter; permission gate denies write 403)
- [x] Full suite — **517/517 pass**

### W61 Gate Evidence — COMPLETE
- [x] `application/sod-runtime/sod-runtime.service.ts` — `listEvaluations`/`getEvaluation`/`evaluateSod`/`deriveVerdict` over `<tenant_schema>.sod_evaluations`; verdict enum `allowed|blocked|requires_approval|requires_review`; reads `sod_conflict_matrix` for the IN-pair lookup; `bad_input` guard
- [x] `interface/http/sod-runtime.routes.ts` — sub-router (GET, GET /:id, POST /evaluate); permission gates `sod.evaluation.read|write`; audit `sod.evaluate`
- [x] `bootstrap.ts` — `sodRuntimeDeps?: SodRuntimeRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types + deriveVerdict helper
- [x] `tests/integration/sod-runtime-vertical.test.mjs` — **10/10** (deriveVerdict empty=allowed, forbidden dominates, requires_approval over requires_review; GET empty list; POST evaluate no conflicts=allowed+audit; forbidden pair=blocked; requires_approval pair; single role no pair check=allowed; missing required=bad_input; list filter by verdict + permission gate denies write 403)
- [x] Full suite — **507/507 pass**

### W60 Gate Evidence — COMPLETE
- [x] `application/event-publisher/event-publisher.service.ts` — `listOutboxEvents`/`getOutboxEvent`/`publishEvent`/`markDispatched`/`markFailed`/`dispatchPendingEvents` over `<tenant_schema>.event_outbox`; status enum `pending|dispatched|failed`; FIFO ordering by `created_at ASC`; `bad_input` guard
- [x] `interface/http/event-publisher.routes.ts` — sub-router (GET, GET /:id, POST publish, POST /dispatch); permission gates `event.outbox.read|write`; audit `event.publish`/`event.dispatch`
- [x] `bootstrap.ts` — `eventPublisherDeps?: EventPublisherRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/event-publisher-vertical.test.mjs` — **10/10** (GET empty list, POST publish creates pending+audit, POST publish missing required=bad_input, POST /dispatch drains pending→dispatched, POST /dispatch handler error→marks failed with errorMessage, list filter status narrows, list filter eventType narrows, GET /:id 404, dispatch increments attempts, permission gate denies write 403)
- [x] Full suite — **497/497 pass**

### W59 Gate Evidence — COMPLETE
- [x] `application/drift-detector/drift-detector.service.ts` — `listDriftRecords`/`runDriftDetection`/`diffBaselineFrameworks`/`diffBaselineRequirements` over `<tenant_schema>.drift_records`; entity_type enum `framework|requirement`; drift_kind enum `added|removed|changed`; deterministic diff (added=in current/missing-in-baseline, removed=in baseline/missing-in-current, changed=title/version/regulator/criticality differ); requirement key `frameworkCode::code`; reads current `frameworks` + `requirements` rows; per-delta INSERT with JSONB before/after; `bad_input` guard
- [x] `interface/http/drift-detector.routes.ts` — sub-router (GET, POST /run); permission gates `drift.record.read|write`; audit `drift.run`
- [x] `bootstrap.ts` — `driftDetectorDeps?: DriftDetectorRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types + diff helpers
- [x] `tests/integration/drift-detector-vertical.test.mjs` — **10/10** (diffBaselineFrameworks added/removed/changed unit, diffBaselineRequirements key composite, GET empty list, POST /run inserts deltas+audit, POST identical=0 inserted, POST removed framework writes removed row, POST without baseline=bad_input, POST missing packCode=bad_input, list filter driftKind narrows, permission gate denies write 403)
- [x] Full suite — **487/487 pass**

### W58 Gate Evidence — COMPLETE
- [x] `application/content-pack-loader/content-pack-loader.service.ts` — `listContentPackImports`/`getContentPackImport`/`loadContentPack`/`hashPack` over `<tenant_schema>.content_pack_imports`; SHA-256 canonical hash on `{packCode, version, frameworks, requirements, instrument}`; idempotency check by `pack_code + content_hash + status='success'` → write `noop` row with zeros; per-row inserts into `frameworks`/`requirements`/`instrument_structure` with `ON CONFLICT DO NOTHING`; `bad_input` guard on missing pack/packCode/version
- [x] `interface/http/content-pack-loader.routes.ts` — sub-router (GET, GET /:id, POST /load); permission gates `content_pack.import.read|write`; audit `content_pack.load`
- [x] `bootstrap.ts` — `contentPackLoaderDeps?: ContentPackLoaderRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types + `hashPack` helper + ContentPack types
- [x] `tests/integration/content-pack-loader-vertical.test.mjs` — **10/10** (hashPack deterministic, empty list, full load inserts FW+req+instrument with audit, idempotent reload returns noop, different version yields different hash → success not noop, missing pack=bad_input, missing packCode=bad_input, list filter by packCode narrows, /:id 404, permission gate denies write 403)
- [x] Full suite — **477/477 pass**

### W57 Gate Evidence — COMPLETE
- [x] `application/compliance-calculator/compliance-calculator.service.ts` — `listCalculations`/`getCalculation`/`getLatestCalculation`/`runCalculation` over `<tenant_schema>.compliance_calculations`; scope enum `framework|control|workspace`; deterministic formula `(satisfied + 0.5*partial)/total * 100` rounded to 2dp; pulls requirement aggregation by scope filter (framework_code|control_id|workspace_id) and counts open gaps (NOT IN closed/resolved); breakdown JSONB persisted; `bad_input`/`bad_scope` guards
- [x] `interface/http/compliance-calculator.routes.ts` — sub-router (GET, GET /latest, GET /:id, POST /run); permission gates `compliance_calculator.calc.read|write`; audit `compliance_calculator.run`
- [x] `bootstrap.ts` — `complianceCalculatorDeps?: ComplianceCalculatorRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/compliance-calculator-vertical.test.mjs` — **10/10** (empty list, all-met=100, mixed=37.5 weighted, zero-requirements=0, open gaps exclude closed/resolved, bad_input, bad_scope, /latest returns most recent, /latest missing scope=bad_input, /:id 404 + permission gate denies write 403)
- [x] Full suite — **467/467 pass**

### W56 Gate Evidence — COMPLETE
- [x] `application/compliance-universe/compliance-universe.service.ts` — `listUniverseNodes`/`getUniverseNode`/`createUniverseNode`/`updateUniverseNodeStatus`/`deleteUniverseNode` over `<tenant_schema>.compliance_universe_nodes`; node_type enum `framework|control|obligation|requirement|sector|instrument|gap|finding|regulator|workspace|entity`; status enum `active|deprecated` (default `active`); attributes JSONB defaulting to `{}`; required-field `bad_input` for nodeType+nodeCode+label; `bad_node_type`/`bad_status` enum guards; ordered by `node_type ASC, label ASC`
- [x] `interface/http/compliance-universe.routes.ts` — sub-router (GET, GET /:id, POST, PATCH /:id/status, DELETE /:id); permission gates `compliance_universe.node.read|write`; audit `compliance_universe.create|status|delete`
- [x] `bootstrap.ts` — `complianceUniverseDeps?: ComplianceUniverseRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/compliance-universe-vertical.test.mjs` — **10/10** (empty list, POST defaults active + attributes={} + audit, POST attributes JSONB persists, bad_input, bad_node_type, PATCH deprecated, PATCH bad_status 400, list filter nodeType narrows, ILIKE search on label OR code, DELETE 204→404 + permission gate denies write 403)
- [x] Full suite — **457/457 pass**

### W55 Gate Evidence — COMPLETE
- [x] `application/bilingual-content/bilingual-content.service.ts` — `listBilingualContent`/`getBilingualContent`/`createBilingualContent`/`updateBilingualContentStatus`/`deleteBilingualContent` over `<tenant_schema>.bilingual_content`; language enum `en|ar` (required); status enum `draft|approved|deprecated` (default `draft`); required-field `bad_input` for entityType+entityId+fieldKey+content; `bad_language`/`bad_status` enum guards; `translator_id` defaults to actorId; PATCH /status auto-stamps `approved_by` + `approved_at` on `approved`; ordered by `entity_type, entity_id, field_key, language ASC`
- [x] `interface/http/bilingual-content.routes.ts` — sub-router (GET, GET /:id, POST, PATCH /:id/status, DELETE /:id); permission gates `bilingual_content.content.read|write`; audit `bilingual_content.create|status|delete`
- [x] `bootstrap.ts` — `bilingualContentDeps?: BilingualContentRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/bilingual-content-vertical.test.mjs` — **10/10** (empty list, POST defaults draft + translatorId + audit, bad_input, bad_language, bad_status, PATCH approved auto-stamps approvedBy+approvedAt, PATCH bad_status 400, list filter entityId+language narrows, DELETE 204→404, permission gate denies write 403)
- [x] Full suite — **447/447 pass**

### W54 Gate Evidence — COMPLETE
- [x] `application/submission-packets/submission-packets.service.ts` — `listSubmissionPackets`/`getSubmissionPacket`/`createSubmissionPacket`/`updateSubmissionPacketStatus`/`deleteSubmissionPacket` over `<tenant_schema>.submission_packets`; status enum `draft|under_review|submitted|accepted|rejected|withdrawn` (default `draft`); required-field `bad_input` for regulatorCode+frameworkCode+title; `bad_status` enum guard; PATCH /status auto-stamps `submitted_at` + `submitted_by` (only when null) on `submitted`; auto-stamps `accepted_at` (only when null) on `accepted`; captures `rejection_reason` on `rejected`; ordered by `created_at DESC`
- [x] `interface/http/submission-packets.routes.ts` — sub-router (GET, GET /:id, POST, PATCH /:id/status, DELETE /:id); permission gates `submission_packet.packet.read|write`; audit `submission_packet.create|status|delete`
- [x] `bootstrap.ts` — `submissionPacketsDeps?: SubmissionPacketsRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/submission-packets-vertical.test.mjs` — **10/10** (empty list, POST defaults draft + audit, bad_input, bad_status, PATCH submitted auto-stamps submittedAt+submittedBy, PATCH accepted auto-stamps acceptedAt, PATCH rejected captures rejectionReason, PATCH bad_status 400, list filter regulatorCode+status narrows, DELETE 204→404 + permission gate denies write 403)
- [x] Full suite — **437/437 pass**

### W53 Gate Evidence — COMPLETE
- [x] `application/regulator-bulletins/regulator-bulletins.service.ts` — `listRegulatorBulletins`/`getRegulatorBulletin`/`createRegulatorBulletin`/`updateRegulatorBulletinStatus`/`deleteRegulatorBulletin` over `<tenant_schema>.regulator_bulletins`; severity enum `low|medium|high|critical` (default `medium`); status enum `draft|published|superseded|archived` (default `draft`); required-field `bad_input` for regulatorCode+bulletinCode+title; `bad_severity`/`bad_status` enum guards; PATCH /status auto-stamps `published_at` (only when null) on `published`; ordered by `published_at DESC NULLS LAST, created_at DESC`
- [x] `interface/http/regulator-bulletins.routes.ts` — sub-router (GET, GET /:id, POST, PATCH /:id/status, DELETE /:id); permission gates `regulator_bulletin.bulletin.read|write`; audit `regulator_bulletin.create|status|delete`
- [x] `bootstrap.ts` — `regulatorBulletinsDeps?: RegulatorBulletinsRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/regulator-bulletins-vertical.test.mjs` — **10/10** (empty list, POST defaults medium+draft + audit, bad_input, bad_severity, PATCH /status published auto-stamps publishedAt, PATCH bad_status 400, list filter regulatorCode+severity narrows, ILIKE search on title, DELETE 204→404, permission gate denies write 403)
- [x] Full suite — **427/427 pass**

### W52 Gate Evidence — COMPLETE
- [x] `application/sectors/sectors.service.ts` — `listSectors`/`getSector`/`createSector`/`deleteSector` over `<tenant_schema>.sectors`; status enum `active|inactive` (default `active`); required-field `bad_input` for code+name; `bad_status` enum guard; ILIKE search on name; ordered by `name ASC`
- [x] `application/framework-sector-applicability/framework-sector-applicability.service.ts` — `listFrameworkSectorApplicability`/`get`/`create`/`delete` over `<tenant_schema>.framework_sector_applicability`; applicability enum `mandatory|recommended|optional|not_applicable` (default `mandatory`); required-field `bad_input` for frameworkCode+sectorId; `bad_applicability` enum guard; filter by frameworkCode/sectorId/applicability; ordered by `framework_code ASC`
- [x] `interface/http/sectors.routes.ts` — sub-router (GET, GET /:id, POST, DELETE /:id); permission gates `sector.sector.read|write`; audit `sector.create|delete`
- [x] `interface/http/framework-sector-applicability.routes.ts` — sub-router (GET, GET /:id, POST, DELETE /:id); permission gates `framework_sector.applicability.read|write`; audit `framework_sector_applicability.create|delete`
- [x] `bootstrap.ts` — `sectorsDeps`/`frameworkSectorApplicabilityDeps` options; composite.use wired
- [x] `tsconfig.json` includes 4 new TS files; clean rebuild green
- [x] `index.ts` exports both services + router factories + types
- [x] `tests/integration/sectors-vertical.test.mjs` — **7/7** (empty list, POST defaults active+audit, bad_input, bad_status, ILIKE search narrows, DELETE 204→404, permission gate)
- [x] `tests/integration/framework-sector-applicability-vertical.test.mjs` — **8/8** (empty list, POST defaults mandatory+audit, bad_input, bad_applicability, list filter by frameworkCode, list filter by applicability, DELETE 204→404, permission gate)
- [x] Full suite — **417/417 pass**

### W51 Gate Evidence — COMPLETE
- [x] `application/instrument-structure/instrument-structure.service.ts` — `listInstrumentNodes`/`getInstrumentNode`/`createInstrumentNode`/`deleteInstrumentNode` over `<tenant_schema>.instrument_structure`; node_type enum `instrument|chapter|article|clause`; parent_node_id integrity guard (`instrument` must have no parent; `chapter|article|clause` require parent); ordinal numeric ordering; body for full clause text; language default `en`; bad_input on missing instrumentCode/label; bad_node_type / bad_parent enum guards; ordered by `instrument_code ASC, ordinal ASC`
- [x] `interface/http/instrument-structure.routes.ts` — sub-router (GET, GET /:id, POST, DELETE /:id); permission gates `instrument.node.read|write`; audit `instrument_node.create|delete`
- [x] `bootstrap.ts` — `instrumentStructureDeps?: InstrumentStructureRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/instrument-structure-vertical.test.mjs` — **10/10** (empty list, POST root instrument default lang=en + audit, POST chapter without parent → bad_parent, POST instrument WITH parent → bad_parent, bad_node_type 400, bad_input 400, list filter instrumentCode+nodeType=clause narrows, list filter parentNodeId returns immediate children, DELETE 204→404, permission gate denies write 403)
- [x] Full suite — **402/402 pass**

### W50 Gate Evidence — COMPLETE
- [x] `application/workspaces/workspaces.service.ts` — `listWorkspaces`/`getWorkspace`/`createWorkspace`/`updateWorkspaceStatus`/`deleteWorkspace` over `<tenant_schema>.workspaces`; status enum `active|inactive|archived` (default `active`); parent_workspace_id supports hierarchy (Group→Region→Subsidiary); owner_user_id defaults to actorId; required-field `bad_input` for code+name; `bad_status` enum guard; ILIKE search on name; ordered by `name ASC`
- [x] `interface/http/workspaces.routes.ts` — sub-router (GET, GET /:id, POST, PATCH /:id/status, DELETE /:id); permission gates `workspace.workspace.read|write`; audit `workspace.create|status|delete`
- [x] `bootstrap.ts` — `workspacesDeps?: WorkspacesRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/workspaces-vertical.test.mjs` — **9/9** (empty list, POST defaults active+ownerUserId=actor + audit create, bad_input on missing code/name, bad_status 400, PATCH /status archived + bad_status 400, list filter parentWorkspaceId narrows hierarchy lookup, ILIKE search on name, DELETE 204→404, permission gate denies write 403)
- [x] Full suite — **392/392 pass**

### W49 Gate Evidence — COMPLETE
- [x] `application/evidence-files/evidence-files.service.ts` — `listEvidenceFiles`/`getEvidenceFile`/`createEvidenceFile`/`updateEvidenceFileStatus`/`deleteEvidenceFile` over `<tenant_schema>.evidence_files`; metadata-only (binary lives in object storage); status enum `active|quarantined|expired|deleted`; required-field `bad_input` for filename+mimeType+contentHash+storageUri; `bad_size` for negative/non-finite sizeBytes; `bad_status` enum guard; uploaded_by stamps actorId; control/requirement/finding link nullable; ILIKE search on filename; ordered by `created_at DESC`
- [x] `interface/http/evidence-files.routes.ts` — sub-router (GET, GET /:id, POST, PATCH /:id/status, DELETE /:id); permission gates `evidence_file.file.read|write`; audit `evidence_file.create|status|delete`
- [x] `bootstrap.ts` — `evidenceFilesDeps?: EvidenceFilesRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/evidence-files-vertical.test.mjs` — **9/9** (empty list, POST defaults active+uploadedBy=actor + audit create with contentHash, bad_input on missing required, bad_size on -1, PATCH /status quarantined + bad_status 400, list filter contentHash+controlId narrowing for dedup lookup, ILIKE search on filename, DELETE 204→404, permission gate denies write 403)
- [x] Full suite — **383/383 pass**

### W48 Gate Evidence — COMPLETE
- [x] `application/findings/findings.service.ts` — `listFindings`/`getFinding`/`createFinding`/`updateFindingStatus`/`deleteFinding` over `<tenant_schema>.findings`; severity enum `low|medium|high|critical` (default `medium`); source enum `internal|regulator|audit|self_assessment|monitoring` (default `internal`); status enum `open|in_remediation|remediated|closed|rejected` (default `open`); required-field `bad_input` for title; `bad_severity`/`bad_source`/`bad_status` enum guards; PATCH /status auto-stamps `closed_at` on closed/remediated/rejected, clears on re-open; ILIKE search on title; control/requirement/gap link nullable; ordered by `created_at DESC`
- [x] `interface/http/findings.routes.ts` — sub-router (GET, GET /:id, POST, PATCH /:id/status, DELETE /:id); permission gates `finding.finding.read|write`; audit `finding.create|status|delete`
- [x] `bootstrap.ts` — `findingsDeps?: FindingsRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/findings-vertical.test.mjs` — **9/9** (empty list, POST defaults medium+internal+open + identifiedBy=actor + audit create, bad_input on missing title, bad_severity / bad_source 400, PATCH /status closed stamps closed_at + re-open clears + bad_status 400, list filter severity+source+controlId narrowing, ILIKE search on title, DELETE 204→404, permission gate denies write 403)
- [x] Full suite — **374/374 pass**

### W47 Gate Evidence — COMPLETE
- [x] `application/entities/entities.service.ts` — `listEntities`/`getEntity`/`createEntity`/`updateEntityStatus`/`deleteEntity` over `<tenant_schema>.entities`; `entity_type` enum `subsidiary|business_unit|legal_entity|branch|joint_venture` (default `subsidiary`); `status` enum `active|inactive|archived` (default `active`); required-field `bad_input` for name; `bad_type`/`bad_status` enum guards; ILIKE search on name; ordered by `name ASC`
- [x] `interface/http/entities.routes.ts` — sub-router (GET, GET /:id, POST, PATCH /:id/status, DELETE /:id); permission gates `entity.entity.read|write`; audit `entity.create|status|delete`
- [x] `bootstrap.ts` — `entitiesDeps?: EntitiesRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/entities-vertical.test.mjs` — **9/9** (empty list, POST defaults subsidiary+active + audit create, bad_input on missing name, bad_type 400, PATCH /status archived + bad_status 400, list filter entityType+status narrowing, ILIKE search on name, DELETE 204→404, permission gate denies write 403)
- [x] Full suite — **365/365 pass**

### W46 Gate Evidence — COMPLETE
- [x] `application/sod-conflict-matrix/sod-conflict-matrix.service.ts` — `listSodConflicts`/`getSodConflict`/`createSodConflict`/`deleteSodConflict` over `<tenant_schema>.sod_conflict_matrix`; `conflict_type` enum `forbidden|requires_approval|requires_review` (default `forbidden`); `severity` enum `low|medium|high|critical` (default `high`); required-field `bad_input` for roleA+roleB; rejects `roleA===roleB` with `bad_input`; `bad_type`/`bad_severity` enum guards; tenant_id stamped from ctx; ordered by `created_at DESC`
- [x] `interface/http/sod-conflict-matrix.routes.ts` — sub-router (GET, GET /:id, POST, DELETE /:id); permission gates `sod_conflict.matrix.read|write`; audit `sod_conflict.create|delete`
- [x] `bootstrap.ts` — `sodConflictMatrixDeps?: SodConflictMatrixRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/sod-conflict-matrix-vertical.test.mjs` — **9/9** (empty list, POST defaults forbidden+high + audit create, bad_input on missing required, bad_input on roleA===roleB, bad_type 400, bad_severity 400, list filter roleA+severity narrowing, DELETE 204→404, permission gate denies write 403)
- [x] Full suite — **356/356 pass**

### W45 Gate Evidence — COMPLETE
- [x] `application/crosswalk-mappings/crosswalk-mappings.service.ts` — `listCrosswalkMappings`/`getCrosswalkMapping`/`createCrosswalkMapping`/`deleteCrosswalkMapping` over `<tenant_schema>.crosswalk_mappings`; relationship enum `equivalent|partial|related|derived_from` (default `related`); confidence default 1.0 with [0,1] range validation; required-field `bad_input` for sourceControlId+targetRequirementId; `bad_relationship`/`bad_confidence` enum/range guards; ordered by `created_at DESC`
- [x] `interface/http/crosswalk-mappings.routes.ts` — sub-router (GET, GET /:id, POST, DELETE /:id); permission gates `crosswalk_mapping.mapping.read|write`; audit `crosswalk_mapping.create|delete`
- [x] `bootstrap.ts` — `crosswalkMappingsDeps?: CrosswalkMappingsRouterDeps` option; composite.use wired
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/crosswalk-mappings-vertical.test.mjs` — **9/9** (empty list, POST defaults related+1.0 + audit create, bad_input on missing required, bad_relationship 400, bad_confidence 400, GET single 200→404, list filter source+relationship narrowing, DELETE 204→404, permission gate denies write 403)
- [x] Full suite — **347/347 pass**

### W44 Gate Evidence — COMPLETE
- [x] `application/ucf-controls/ucf-controls.service.ts` — `listUcfControls`/`getUcfControl`/`createUcfControl`/`updateUcfControl`/`updateUcfLifecycle`/`deleteUcfControl` over `<tenant_schema>.ucf_controls`; lifecycle_state enum `draft|active|deprecated|retired`; required-field `bad_input` for code; `bad_state` on bad enum; PATCH preserves fields via COALESCE (with `::jsonb` casts for JSONB COALESCE); ILIKE search across code/objective_en/activity_en; ordered by `code ASC`
- [x] `interface/http/ucf-controls.routes.ts` — sub-router (GET, GET /:id, POST, PATCH /:id, PATCH /:id/lifecycle, DELETE /:id); permission gates `ucf_control.control.read|write`; audit `ucf_control.create|update|lifecycle|delete`
- [x] `bootstrap.ts` — `ucfControlsDeps?: UcfControlsRouterDeps` option
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/ucf-controls-vertical.test.mjs` — **8/8** (empty list, POST defaults draft, bad_input on missing code, PATCH owner+frequency COALESCE + audit before/after, PATCH /lifecycle active + bad_state 400, lifecycle+owner filter narrowing, search ILIKE on objective_en, DELETE 204→404 + 403 gate)
- [x] Full suite — **338/338 pass**

### W43 Gate Evidence — COMPLETE
- [x] `application/csa-responses/csa-responses.service.ts` — append-only `listCsaResponses`/`getCsaResponse`/`createCsaResponse` over `<tenant_schema>.csa_responses`; rating enum `effective|partially_effective|ineffective|not_assessed` (renamed `CsaEffectivenessRating` to avoid collision with control-effectiveness export); required-field `bad_input` for campaignId+controlId; `bad_rating` on bad enum; respondent defaults to actorId; ordered by `submitted_at DESC`
- [x] `interface/http/csa-responses.routes.ts` — sub-router (GET, GET /:id, POST); permission gates `csa_response.response.read|write`; audit `csa_response.submit` (after captures campaignId+controlId+effectivenessRating); no PATCH/DELETE
- [x] `bootstrap.ts` — `csaResponsesDeps?: CsaResponsesRouterDeps` option
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types (`CsaEffectivenessRating`)
- [x] `tests/integration/csa-responses-vertical.test.mjs` — **8/8** (empty list, POST defaults respondent=actor + rating=not_assessed, bad_input on missing required, bad_rating 400, full POST + audit submit fires, GET single 200→404, list filter campaignId+rating narrowing, 403 permission gate)
- [x] Full suite — **330/330 pass**

### W42 Gate Evidence — COMPLETE
- [x] `application/csa-campaigns/csa-campaigns.service.ts` — `listCsaCampaigns`/`getCsaCampaign`/`createCsaCampaign`/`updateCsaCampaignStatus`/`deleteCsaCampaign` over `<tenant_schema>.csa_campaigns`; status enum `draft|active|closed|archived`; required-field `bad_input` for title; `bad_status` on bad enum; control_ids+respondent_ids JSONB persisted via `JSON.stringify` with safe `j()` parser
- [x] `interface/http/csa-campaigns.routes.ts` — sub-router (GET, GET /:id, POST, PATCH /:id/status, DELETE /:id); permission gates `csa_campaign.campaign.read|write`; audit `csa_campaign.create|status|delete`
- [x] `bootstrap.ts` — `csaCampaignsDeps?: CsaCampaignsRouterDeps` option
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/csa-campaigns-vertical.test.mjs` — **8/8** (empty list, POST defaults draft + createdBy=actor + arrays, bad_input on missing title, PATCH /status active + audit before/after, bad_status 400, 404 on missing, status filter narrowing, DELETE 204→404 + 403 gate)
- [x] Full suite — **322/322 pass**

### W41 Gate Evidence — COMPLETE
- [x] `application/attestation-drafts/attestation-drafts.service.ts` — `listDrafts`/`getDraft`/`createDraft`/`reviewDraft`/`deleteDraft` over `<tenant_schema>.attestation_drafts`; entity_type enum `framework|control`; status enum `draft|pending_review|approved|rejected`; required-field `bad_input` for entityType+entityId; `bad_entity_type`/`bad_status` on bad enums; review stamps `approved_by`+`approved_at` only when status IN (approved,rejected) via SQL CASE WHEN $4::boolean; readiness_score+content JSONB persisted via `JSON.stringify` with safe `j()` parser
- [x] `interface/http/attestation-drafts.routes.ts` — sub-router (GET, GET /:id, POST, PATCH /:id/review, DELETE /:id); permission gates `attestation_draft.draft.read|write`; audit `attestation_draft.create|review|delete`
- [x] `bootstrap.ts` — `attestationDraftsDeps?: AttestationDraftsRouterDeps` option
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/attestation-drafts-vertical.test.mjs` — **8/8** (empty list, POST defaults framework/draft, bad_input on missing entityId, review approved stamps approved_by/at + audit, pending_review keeps null, bad_status 400, entityType filter narrowing, DELETE 204→404 + 403 gate)
- [x] Full suite — **314/314 pass**

### W40 Gate Evidence — COMPLETE
- [x] `application/attestation-records/attestation-records.service.ts` — `listRecords`/`getRecord`/`createRecord`/`attestRecord`/`remindRecord`/`deleteRecord` over `<tenant_schema>.attestation_records`; status enum `pending|attested|declined|expired`; required-field `bad_input` for campaignId+userId; `bad_status` on bad enum; attest stamps `attested_at = NOW()` only when status=attested via CASE; remind stamps `last_reminded_at = NOW()`
- [x] `interface/http/attestation-records.routes.ts` — sub-router (GET, GET /:id, POST, PATCH /:id/attest, PATCH /:id/remind, DELETE /:id); permission gates `attestation_record.record.read|write`; audit `attestation_record.create|attest|remind|delete`
- [x] `bootstrap.ts` — `attestationRecordsDeps?: AttestationRecordsRouterDeps` option
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/attestation-records-vertical.test.mjs` — **8/8** (empty list, POST defaults pending + attested_at null, bad_input on missing required, attest stamps + audit, declined keeps null + reason, bad_status 400, remind stamps last_reminded_at, list filter narrowing + DELETE 204→404 + 403 gate)
- [x] Full suite — **306/306 pass**

### W39 Gate Evidence — COMPLETE
- [x] `application/attestation-campaigns/attestation-campaigns.service.ts` — `listCampaigns`/`getCampaign`/`createCampaign`/`updateCampaignStatus`/`deleteCampaign` over `<tenant_schema>.attestation_campaigns`; entity_type enum `framework|control`; status enum `draft|active|in_progress|submitted|reviewed|approved|rejected|expired`; required-field `bad_input` for name; `bad_entity_type`/`bad_status` on bad enums; metadata JSONB persisted via `JSON.stringify`
- [x] `interface/http/attestation-campaigns.routes.ts` — sub-router on composite `/api/compliance` (GET, GET /:id, POST, PATCH /:id/status, DELETE /:id); permission gates `attestation_campaign.campaign.read|write`; audit `attestation_campaign.create|status|delete`
- [x] `bootstrap.ts` — `attestationCampaignsDeps?: AttestationCampaignsRouterDeps` option
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/attestation-campaigns-vertical.test.mjs` — **8/8** (empty list, POST defaults framework/draft + createdBy=actor, bad_input on missing name, bad_entity_type, policyId+status filter narrowing, PATCH /status + audit before/after, bad_status 400, DELETE 204→404 + 403 permission gate)
- [x] Full suite — **298/298 pass**

### W38 Gate Evidence — COMPLETE
- [x] `application/control-test-schedules/control-test-schedules.service.ts` — `listSchedules`/`getSchedule`/`createSchedule`/`updateSchedule`/`recordExecution`/`deleteSchedule` over `<tenant_schema>.control_test_schedules`; frequency enum `daily|weekly|monthly|quarterly|annually`; result enum `pass|fail|error`; required-field `bad_input` for controlId; `bad_frequency`/`bad_result` on bad enums; ordered by `next_execution_date ASC NULLS LAST, created_at DESC`; PATCH preserves fields via COALESCE; recordExecution stamps `last_executed_at = NOW()` + advances `next_execution_date`
- [x] `interface/http/control-test-schedules.routes.ts` — sub-router on composite `/api/compliance` (GET, GET /:id, POST, PATCH /:id, PATCH /:id/execution, DELETE /:id); permission gates `control_test_schedule.schedule.read|write`; audit `control_test_schedule.create|update|execution|delete` (execution before/after captures lastResult+lastExecutedAt)
- [x] `bootstrap.ts` — `controlTestSchedulesDeps?: ControlTestSchedulesRouterDeps` option
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/control-test-schedules-vertical.test.mjs` — **8/8** (empty list, POST defaults annually/autoExecute=false, bad_input on missing controlId, bad_frequency on invalid enum, controlId+frequency filter narrowing, PATCH /execution stamps lastResult + nextExecutionDate + audit before/after, bad_result 400, DELETE 204→404 + 403 permission gate)
- [x] Full suite — **290/290 pass**

### W37 Gate Evidence — COMPLETE
- [x] `application/control-scope-tags/control-scope-tags.service.ts` — `listScopeTags`/`getScopeTag`/`upsertScopeTag` (ON CONFLICT (control_id, scope) DO UPDATE)/`signOffScopeTag`/`deleteScopeTag` over `<tenant_schema>.control_scope_tags`; required-field `bad_input` for controlId+scope; sign-off defaults signedOffBy=actorId
- [x] `interface/http/control-scope-tags.routes.ts` — sub-router on composite `/api/compliance` (GET, GET /:id, POST upsert, PATCH /:id/sign-off, DELETE /:id); permission gates `control_scope_tag.scope.read|write`; audit `control_scope_tag.upsert|sign-off|delete`
- [x] `bootstrap.ts` — `controlScopeTagsDeps?: ControlScopeTagsRouterDeps` option
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/control-scope-tags-vertical.test.mjs` — **8/8** (empty list, POST defaults inScope=true, bad_input on missing required, upsert on (controlId,scope) duplicate keeps single row, controlId+inScope filter narrowing, PATCH /sign-off stamps signedOffBy/At + audit before/after, DELETE then 404, 403 permission gate)
- [x] Full suite — **282/282 pass**

### W36 Gate Evidence — COMPLETE
- [x] `application/control-effectiveness/control-effectiveness.service.ts` — append-only `listEffectiveness`/`getEffectiveness`/`getLatestEffectiveness`/`createEffectiveness` over `<tenant_schema>.control_effectiveness_assessments`; assessment_type enum `design|operating`; rating enum `effective|partially_effective|ineffective|not_assessed`; required-field `bad_input` for controlId; `bad_assessment_type`/`bad_rating` on bad enums; ordered by `assessment_date DESC`
- [x] `interface/http/control-effectiveness.routes.ts` — sub-router on composite `/api/compliance` (GET, GET /latest/:controlId (optional ?assessmentType=), GET /:id, POST); permission gates `control_effectiveness.assessment.read|write`; audit `control_effectiveness.record` (after controlId+assessmentType+rating); no PATCH/DELETE
- [x] `bootstrap.ts` — `controlEffectivenessDeps?: ControlEffectivenessRouterDeps` option
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/control-effectiveness-vertical.test.mjs` — **8/8** (empty list, POST defaults design/not_assessed/actor, bad_input on missing controlId, bad_rating on invalid enum, controlId+assessmentType+rating filter narrowing, GET /latest highest assessment_date, audit fires with rating in after, 403 permission gate)
- [x] Full suite — **274/274 pass**

### W35 Gate Evidence — COMPLETE
- [x] `application/control-deficiencies/control-deficiencies.service.ts` — tenant-schema-scoped CRUD + `updateDeficiencyStatus` + `deleteDeficiency` over `<tenant_schema>.control_deficiencies` (no tenant_id column — schema isolation only); status enum `identified|remediation_in_progress|validated|closed`; severity enum `low|medium|high|critical`; required-field validation `bad_input` for controlId+title; `bad_severity` on bad enum; PATCH preserves closure_notes via COALESCE; ordered by `created_at DESC`
- [x] `interface/http/control-deficiencies.routes.ts` — sub-router on composite `/api/compliance` (GET, GET/:id, POST, PATCH /:id/status, DELETE); permission gates `control_deficiency.finding.read|write`; audit `control_deficiency.create|status|delete` (status before/after captures status+closureNotes)
- [x] `bootstrap.ts` — `controlDeficienciesDeps?: ControlDeficienciesRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/control-deficiencies-vertical.test.mjs` — **8/8** (empty list, POST defaults medium/identified + identifiedBy=actor, bad_input on missing required fields, bad_severity on invalid enum, controlId+severity filter narrowing, PATCH /status close + closureNotes + audit before/after, bad_status 400, 403 permission gate)
- [x] Full suite — **266/266 pass**

### W34 Gate Evidence — COMPLETE
- [x] `application/versions/versions.service.ts` — tenant-scoped append-only `listVersions`/`getVersion`/`getLatestVersion`/`recordVersion` over `<tenant_schema>.compliance_versions`; strict `tenant_<id>` schema regex; required-field validation `bad_input` for entityType+entityId; auto-increment version via `COALESCE((SELECT MAX(version)+1 ... WHERE tenant_id=$1 AND entity_type=$3 AND entity_id=$2), 1)`; ordered by `entity_id ASC, version DESC`
- [x] `interface/http/versions.routes.ts` — sub-router on composite `/api/compliance` (`GET /versions`, `GET /versions/latest/:entityType/:entityId`, `GET /versions/:id`, `POST /versions`); permission gates `version.snapshot.read` / `version.snapshot.write`; audit `version.record` (after entityType+entityId+version); no PATCH/DELETE (audit-grade immutability)
- [x] `bootstrap.ts` — `versionsDeps?: VersionsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/versions-vertical.test.mjs` — **8/8** (empty list, POST v1 + auto-increment v2, bad_input on missing required fields, GET /latest highest version, GET /latest 404 missing, entityType+entityId filter narrowing, audit version.record fires with version number, 403 permission gate)
- [x] Full suite — **258/258 pass**

### W33 Gate Evidence — COMPLETE
- [x] `application/ai-suggestions/ai-suggestions.service.ts` — tenant-scoped CRUD + `reviewSuggestion` over `<tenant_schema>.compliance_ai_suggestions`; strict `tenant_<id>` schema regex; status enum `pending|accepted|rejected|expired`; required-field validation `bad_input` for entityType+suggestionType+title; numeric validation for confidence in [0,1]; PATCH stamps `reviewed_by = $actor` and `reviewed_at = NOW()`; ordered by `created_at DESC`
- [x] `interface/http/ai-suggestions.routes.ts` — sub-router on composite `/api/compliance` (`/ai-suggestions`, `/ai-suggestions/:id`, `POST /ai-suggestions`, `PATCH /ai-suggestions/:id/review`); permission gates `ai_suggestion.recommendation.read` / `ai_suggestion.recommendation.write`; audit `ai_suggestion.create` and `ai_suggestion.review` (before/after status+reviewedBy)
- [x] `bootstrap.ts` — `aiSuggestionsDeps?: AiSuggestionsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/ai-suggestions-vertical.test.mjs` — **8/8** (empty list, POST defaults pending + numeric confidence, bad_input on missing required fields, bad_input on confidence>1, suggestionType+status filter narrowing, PATCH /review accept + audit before/after, bad_status 400, 403 permission gate)
- [x] Full suite — **250/250 pass**

### W32 Gate Evidence — COMPLETE
- [x] `application/report-snapshots/report-snapshots.service.ts` — tenant-scoped immutable snapshots over `<tenant_schema>.compliance_report_snapshots`; strict `tenant_<id>` schema regex; required-field validation `bad_input` for reportType+title; default `includeExpired=false` filters via `expires_at IS NULL OR expires_at > NOW()`; ordered by `generated_at DESC`
- [x] `interface/http/report-snapshots.routes.ts` — sub-router on composite `/api/compliance` (`/report-snapshots`, `/report-snapshots/:id`, `POST`, `DELETE`); permission gates `report_snapshot.snapshot.read` / `report_snapshot.snapshot.write`; audit `report_snapshot.create` and `report_snapshot.delete`
- [x] `bootstrap.ts` — `reportSnapshotsDeps?: ReportSnapshotsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/report-snapshots-vertical.test.mjs` — **8/8** (empty list, POST + parameters/resultData round-trip, bad_input on missing required fields, reportType+generatedBy filter, expires_at default-hide vs includeExpired, DELETE + audit before + 404 second delete, GET missing 404, 403 permission gate)
- [x] Full suite — **242/242 pass**

### W31 Gate Evidence — COMPLETE
- [x] `application/external-mappings/external-mappings.service.ts` — tenant-scoped CRUD + `recordSync` over `<tenant_schema>.compliance_external_mappings`; strict `tenant_<id>` schema regex; sync_status enum `synced|pending|error|stale|disconnected`; required-field validation `bad_input` for entityType+entityId+externalSystem+externalId; PATCH stamps `last_synced_at = NOW()`; ordered by `external_system ASC, created_at DESC`
- [x] `interface/http/external-mappings.routes.ts` — sub-router on composite `/api/compliance` (`/external-mappings`, `/external-mappings/:id`, `POST /external-mappings`, `PATCH /external-mappings/:id/sync`, `DELETE /external-mappings/:id`); permission gates `external_mapping.link.read` / `external_mapping.link.write`; audit `external_mapping.create|sync|delete` (sync captures before/after status+lastSyncedAt)
- [x] `bootstrap.ts` — `externalMappingsDeps?: ExternalMappingsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/external-mappings-vertical.test.mjs` — **8/8** (empty list, POST defaults synced + null lastSyncedAt, bad_input on missing required fields, bad_sync_status on invalid enum, externalSystem+syncStatus filter narrowing 3→1, PATCH sync stamps lastSyncedAt + audit before/after, PATCH/DELETE missing 404, 403 permission gate)
- [x] Full suite — **234/234 pass**

### W30 Gate Evidence — COMPLETE
- [x] `application/change-log/change-log.service.ts` — tenant-scoped append-only `listChangeLog`/`getChangeLog`/`recordChange` over `<tenant_schema>.compliance_change_log`; strict `tenant_<id>` schema regex; required-field validation `bad_input` for entityType+entityId+fieldName; null-safe oldValue/newValue/correlationId; ordered by `changed_at DESC, id DESC`
- [x] `interface/http/change-log.routes.ts` — sub-router on composite `/api/compliance` (`GET /change-log`, `GET /change-log/:id`, `POST /change-log`); permission gates `change_log.entry.read` / `change_log.entry.write`; audit `change_log.record` (with full after snapshot); no update/delete (audit-grade immutability)
- [x] `bootstrap.ts` — `changeLogDeps?: ChangeLogRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/change-log-vertical.test.mjs` — **8/8** (empty list, POST + GET + audit fired, bad_input on missing required fields, null oldValue/newValue accepted, entityType+entityId filter narrowing, fieldName+correlationId filter narrowing, GET missing 404, 403 permission gate)
- [x] Full suite — **226/226 pass**

### W29 Gate Evidence — COMPLETE
- [x] `application/tags/tags.service.ts` — tenant-scoped list/get/create/delete over `<tenant_schema>.compliance_tags`; strict `tenant_<id>` schema regex; required-field validation `bad_input` for entityType+entityId+tagKey+tagValue; ordered by `tag_key ASC, tag_value ASC`
- [x] `interface/http/tags.routes.ts` — sub-router on composite `/api/compliance` (`GET /tags`, `GET /tags/:id`, `POST /tags`, `DELETE /tags/:id`); permission gates `tag.label.read` / `tag.label.write`; audit `tag.create` and `tag.delete` (with full before snapshot)
- [x] `bootstrap.ts` — `tagsDeps?: TagsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/tags-vertical.test.mjs` — **8/8** (empty list, POST + GET round-trip, bad_input on missing required fields, tagKey+tagValue filter narrowing, entityType+entityId filter narrowing, DELETE + audit before + 404 on second delete, GET missing 404, 403 permission gate)
- [x] Full suite — **218/218 pass**

### W28 Gate Evidence — COMPLETE
- [x] `application/comments/comments.service.ts` — tenant-scoped list/get/create/resolve over `<tenant_schema>.compliance_comments`; strict `tenant_<id>` schema regex; required-field validation `bad_input` for entityType+entityId+content; threading via `parent_id`; ordered by `created_at ASC`
- [x] `interface/http/comments.routes.ts` — sub-router on composite `/api/compliance` (`GET /comments`, `GET /comments/:id`, `POST /comments`, `PATCH /comments/:id/resolve`); permission gates `comment.thread.read` / `comment.thread.write`; audit `comment.create` and `comment.resolve` (before/after isResolved)
- [x] `bootstrap.ts` — `commentsDeps?: CommentsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/comments-vertical.test.mjs` — **8/8** (empty list, POST + GET defaults, bad_input on missing required fields, threaded reply via parentId, entityId+isResolved filter narrowing, PATCH /resolve + audit before/after, PATCH on missing 404, 403 permission gate)
- [x] Full suite — **210/210 pass**

### W27 Gate Evidence — COMPLETE
- [x] `application/attachments/attachments.service.ts` — tenant-scoped list/get/create/delete over `<tenant_schema>.compliance_attachments`; strict `tenant_<id>` schema regex; required-field validation `bad_input` for entityType+entityId+fileName+storagePath; non-negative fileSize validation; ordered by `uploaded_at DESC`
- [x] `interface/http/attachments.routes.ts` — sub-router on composite `/api/compliance` (`GET /attachments`, `GET /attachments/:id`, `POST /attachments`, `DELETE /attachments/:id`); permission gates `attachment.file.read` / `attachment.file.write`; audit `attachment.create` and `attachment.delete` (with full before snapshot)
- [x] `bootstrap.ts` — `attachmentsDeps?: AttachmentsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/attachments-vertical.test.mjs` — **8/8** (empty list, POST + GET round-trip, bad_input on missing required fields, bad_input on negative fileSize, entityType+entityId filter narrowing 3→1, DELETE + audit before + 404 on second delete, GET missing 404, 403 permission gate)
- [x] Full suite — **202/202 pass**

### W26 Gate Evidence — COMPLETE
- [x] `application/settings/settings.service.ts` — tenant-scoped list/get/getByKey/upsert/deactivate over `<tenant_schema>.compliance_settings`; strict `tenant_<id>` schema regex; scope enum `tenant|org|user`; UNIQUE(tenant_id, config_key) handled via `INSERT ... ON CONFLICT (tenant_id, config_key) DO UPDATE`; `bad_input` for missing configKey or non-object configValue
- [x] `interface/http/settings.routes.ts` — sub-router on composite `/api/compliance` (`GET /settings`, `GET /settings/:id`, `GET /settings/by-key/:key`, `PUT /settings` returns 200 if existed/201 if new, `DELETE /settings/:id`); permission gates `setting.config.read` / `setting.config.write`; audit `setting.create|update|deactivate`
- [x] `bootstrap.ts` — `settingsDeps?: SettingsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/settings-vertical.test.mjs` — **8/8** (empty list, PUT new=201/existing=200 + audit create+update, bad_input 400, bad_scope 400, by-key lookup + 404, scope+isActive filter narrowing 3→1, DELETE deactivate + audit before/after + 404, 403 permission gate)
- [x] Full suite — **194/194 pass**

### W25 Gate Evidence — COMPLETE
- [x] `application/kpis/kpis.service.ts` — tenant-scoped CRUD + `recordKpiValue` over `<tenant_schema>.compliance_kpis`; strict `tenant_<id>` schema regex; trend enum `up|down|flat|unknown`; required-field validation `bad_input` for kpiCode+name; numeric validation for currentValue/targetValue; PATCH stamps `computed_at = NOW()` and uses COALESCE on trend
- [x] `interface/http/kpis.routes.ts` — sub-router on composite `/api/compliance` (`/kpis`, `/kpis/:id`, `POST /kpis`, `PATCH /kpis/:id/value`); permission gates `kpi.metric.read` / `kpi.metric.write`; audit `kpi.create` and `kpi.value_change` (before/after currentValue + trend)
- [x] `bootstrap.ts` — `kpisDeps?: KpisRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/kpis-vertical.test.mjs` — **8/8** (empty list, POST + numeric coercion, bad_input 400, bad_trend 400, kpiCode+trend filter narrowing 3→1, PATCH value+trend + audit before/after, PATCH on missing 404, permission 403 on write)
- [x] Full suite — **186/186 pass**

### W24 Gate Evidence — COMPLETE
- [x] `application/controls-mapping/controls-mapping.service.ts` — tenant-scoped CRUD + `recordControlTest` over `<tenant_schema>.compliance_controls_mapping`; strict `tenant_<id>` schema regex; mapping_status enum `active|deprecated|pending_review|broken`; effectiveness enum `effective|partially_effective|ineffective|not_tested`; required-field validation `bad_input` for requirementId+controlId; PATCH uses `COALESCE($4::date, CURRENT_DATE)` to auto-stamp last_tested when omitted, COALESCE on next_test_date and tester_id to preserve when omitted
- [x] `interface/http/controls-mapping.routes.ts` — sub-router on composite `/api/compliance` (`/controls-mapping`, `/controls-mapping/:id`, `POST /controls-mapping`, `PATCH /controls-mapping/:id/test`); permission gates `controls_mapping.record.read` / `controls_mapping.record.write`; audit `controls_mapping.create` and `controls_mapping.test` (before/after effectiveness + lastTested)
- [x] `bootstrap.ts` — `controlsMappingDeps?: ControlsMappingRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/controls-mapping-vertical.test.mjs` — **8/8** (empty list, POST defaults active, bad_input 400, bad_effectiveness 400, requirementId+mappingStatus filter narrowing 3→1, PATCH test auto-stamps lastTested + audit before/after, PATCH on missing 404, permission 403 on write)
- [x] Full suite — **178/178 pass**

### W23 Gate Evidence — COMPLETE
- [x] `application/programs/programs.service.ts` — tenant-scoped CRUD + `updateProgramStatus` over `<tenant_schema>.compliance_programs`; strict `tenant_<id>` schema regex; status enum `active|paused|completed|archived|planned`; required-field validation `bad_input` for name+programType; budget validated as non-negative number when provided
- [x] `interface/http/programs.routes.ts` — sub-router on composite `/api/compliance` (`/programs`, `/programs/:id`, `POST /programs`, `PATCH /programs/:id/status`); permission gates `program.record.read` / `program.record.write`; audit `program.create` and `program.status_change` (before/after status)
- [x] `bootstrap.ts` — `programsDeps?: ProgramsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/programs-vertical.test.mjs` — **8/8** (empty list, POST defaults active, bad_input for missing fields, bad_input for negative budget, programType+status filter narrowing 3→1, PATCH status + audit before/after, PATCH on missing 404, permission 403 on write)
- [x] Full suite — **170/170 pass**

### W22 Gate Evidence — COMPLETE
- [x] `application/calendar/calendar.service.ts` — tenant-scoped CRUD + `updateCalendarStatus` over `<tenant_schema>.compliance_calendar`; strict `tenant_<id>` schema regex; status enum `scheduled|in_progress|completed|cancelled|overdue`; required-field validation `bad_input` for title+eventType+startDate; list supports `fromDate`/`toDate` inclusive window on `start_date` plus eventType/frameworkId/status; ordered by `start_date ASC, created_at DESC`
- [x] `interface/http/calendar.routes.ts` — sub-router on composite `/api/compliance` (`/calendar`, `/calendar/:id`, `POST /calendar`, `PATCH /calendar/:id/status`); permission gates `calendar.event.read` / `calendar.event.write`; audit `calendar.create` and `calendar.status_change` (before/after status)
- [x] `bootstrap.ts` — `calendarDeps?: CalendarRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/calendar-vertical.test.mjs` — **8/8** (empty list, POST defaults scheduled, bad_input 400, bad_status 400, eventType+date-window filter narrowing 3→1, PATCH status + audit before/after, PATCH on missing 404, permission 403 on write)
- [x] Full suite — **162/162 pass**

### W21 Gate Evidence — COMPLETE
- [x] `application/roadmap/roadmap.service.ts` — tenant-scoped CRUD + `updateRoadmapStatus` over `<tenant_schema>.compliance_roadmap`; strict `tenant_<id>` schema regex; status enum `planned|in_progress|completed|cancelled|at_risk`; `actual_date` uses `CASE WHEN status='completed' THEN COALESCE($4::date, CURRENT_DATE) ELSE COALESCE($4::date, actual_date) END` so completion auto-stamps server date when omitted; required-field validation `bad_input` for title+milestoneType; list ordering by `COALESCE(target_date, '9999-12-31') ASC` so undated milestones sink
- [x] `interface/http/roadmap.routes.ts` — sub-router on composite `/api/compliance` (`/roadmap`, `/roadmap/:id`, `POST /roadmap`, `PATCH /roadmap/:id/status`); permission gates `roadmap.milestone.read` / `roadmap.milestone.write`; audit `roadmap.create` and `roadmap.status_change` (before/after status + actualDate)
- [x] `bootstrap.ts` — `roadmapDeps?: RoadmapRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/roadmap-vertical.test.mjs` — **8/8** (empty list, POST defaults planned, bad_input 400, bad_status 400, milestoneType+status filter narrowing 3→1, PATCH completed auto-stamps actualDate + audit before/after, PATCH on missing 404, permission 403 on write)
- [x] Full suite — **154/154 pass**

### W20 Gate Evidence — COMPLETE
- [x] `application/posture-scores/posture-scores.service.ts` — append-only `recordPostureScore` over `<tenant_schema>.compliance_posture_scores`; strict `tenant_<id>` schema regex; score validated as number in 0..100 → `bad_input`; `listPostureScores` supports `latestPerFramework` flag using `SELECT DISTINCT ON (framework_id) ... ORDER BY framework_id, computed_at DESC` with matching `COUNT(DISTINCT framework_id)`; no PATCH endpoint (snapshots are immutable)
- [x] `interface/http/posture-scores.routes.ts` — sub-router on composite `/api/compliance` (`/posture-scores`, `/posture-scores/:id`, `POST /posture-scores`); permission gates `posture_score.record.read` / `posture_score.record.write`; audit `posture_score.record`
- [x] `bootstrap.ts` — `postureScoresDeps?: PostureScoresRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/posture-scores-vertical.test.mjs` — **8/8** (empty list, POST snapshot+GET, bad_input missing frameworkId 400, bad_input score range 400 [150 and -1], frameworkId filter narrowing 3→2, latest=true returns 1 per framework picking newest computed_at, audit captures posture_score.record, permission 403 on write)
- [x] Full suite — **146/146 pass**

### W19 Gate Evidence — COMPLETE
- [x] `application/monitoring/monitoring.service.ts` — tenant-scoped CRUD + `recordMonitoringCheck` over `<tenant_schema>.compliance_monitoring`; strict `tenant_<id>` schema regex; status enum `active|paused|failed|retired`; check uses `COALESCE` to auto-fill `last_checked` to NOW() and preserve `next_check`/`status` when omitted; required-field validation `bad_input` for requirementId+monitoringType
- [x] `interface/http/monitoring.routes.ts` — sub-router on composite `/api/compliance` (`/monitoring`, `/monitoring/:id`, `POST /monitoring`, `PATCH /monitoring/:id/check`); permission gates `monitoring.record.read` / `monitoring.record.write`; audit `monitoring.create` and `monitoring.check` (before/after status + lastChecked); boolean filter parsing for automated
- [x] `bootstrap.ts` — `monitoringDeps?: MonitoringRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/monitoring-vertical.test.mjs` — **8/8** (empty list, POST defaults active/false, bad_input 400, bad_status 400, monitoringType+automated filter narrowing 3→1, PATCH check sets lastChecked/nextCheck/status + audit before/after, PATCH on missing 404, permission 403 on write)
- [x] Full suite — **138/138 pass**

### W18 Gate Evidence — COMPLETE
- [x] `application/regulatory-changes/regulatory-changes.service.ts` — tenant-scoped CRUD + `updateRegulatoryChangeStatus` over `<tenant_schema>.compliance_regulatory_changes`; strict `tenant_<id>` schema regex; status enum `new|under_review|in_progress|implemented|dismissed`; `assignedTo` PATCH via `COALESCE` so omitting preserves prior value; required-field validation `bad_input` for regulationName+changeType
- [x] `interface/http/regulatory-changes.routes.ts` — sub-router on composite `/api/compliance` (`/regulatory-changes`, `/regulatory-changes/:id`, `POST /regulatory-changes`, `PATCH /regulatory-changes/:id/status`); permission gates `regulatory_change.record.read` / `regulatory_change.record.write`; audit `regulatory_change.create` and `regulatory_change.status_change` (before/after status + assignedTo)
- [x] `bootstrap.ts` — `regulatoryChangesDeps?: RegulatoryChangesRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/regulatory-changes-vertical.test.mjs` — **8/8** (empty list, POST defaults new, bad_input 400, bad_status 400, changeType+status filter narrowing 3→1, PATCH 200 + audit before/after both fields with assignedTo update, PATCH on missing 404, permission 403 on write)
- [x] Full suite — **130/130 pass**

### W17 Gate Evidence — COMPLETE
- [x] `application/evidence-links/evidence-links.service.ts` — tenant-scoped CRUD + `verifyEvidenceLink` over `<tenant_schema>.compliance_evidence_links`; strict `tenant_<id>` schema regex; `link_type` enum `supporting|primary|compensating|referenced` (default `supporting`); verify toggles set/clear `verified_at`/`verified_by`; required-field validation `bad_input` for requirementId+evidenceId
- [x] `interface/http/evidence-links.routes.ts` — sub-router on composite `/api/compliance` (`/evidence-links`, `/evidence-links/:id`, `POST /evidence-links`, `PATCH /evidence-links/:id/verify`); permission gates `evidence.link.read` / `evidence.link.write`; audit `evidence_link.create` and `evidence_link.verify` (before/after verifiedAt+verifiedBy)
- [x] `bootstrap.ts` — `evidenceLinksDeps?: EvidenceLinksRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/evidence-links-vertical.test.mjs` — **8/8** (empty list, POST defaults supporting, bad_input 400, bad_link_type 400, requirementId+linkType+verifiedOnly filter narrowing 3→1, PATCH verify sets/clears verified_at/verified_by + audit before/after, PATCH on missing 404, permission 403 on write)
- [x] Full suite — **122/122 pass**

### W16 Gate Evidence — COMPLETE
- [x] `application/exceptions/exceptions.service.ts` — tenant-scoped CRUD + `updateExceptionStatus` over `<tenant_schema>.compliance_exceptions`; strict `tenant_<id>` schema regex; `status` enum `pending|approved|rejected|expired|revoked`; conditional SET on `approved_by`/`approved_at` (only when status=approved); required-field validation `bad_input` for requirementId+exceptionType
- [x] `interface/http/exceptions.routes.ts` — sub-router on composite `/api/compliance` (`/exceptions`, `/exceptions/:id`, `POST /exceptions`, `PATCH /exceptions/:id/status`); permission gates `exception.record.read` / `exception.record.write`; audit `exception.create` and `exception.status_change` (before/after status + approvedBy)
- [x] `bootstrap.ts` — `exceptionsDeps?: ExceptionsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/exceptions-vertical.test.mjs` — **8/8** (empty list, POST defaults pending, bad_input 400, bad_status 400, requirementId+status filter narrows from 3→1, PATCH approved sets approvedBy/approvedAt + audit before/after, PATCH on missing 404, permission 403 on write)
- [x] Full suite — **114/114 pass**

### W15 Gate Evidence — COMPLETE
- [x] `application/attestations/attestations.service.ts` — tenant-scoped CRUD + `updateAttestationStatus` over `<tenant_schema>.compliance_attestations`; strict `tenant_<id>` schema regex; `status` enum `active|expired|revoked|pending`; required-field validation `bad_input` for frameworkId+attestationType
- [x] `interface/http/attestations.routes.ts` — top-level router promoted via `routers['/api/compliance-attestation']` override (mount table flips wired=true); permission gates `attestation.record.read` / `attestation.record.write`; audit `attestation.create` and `attestation.status_change` (before/after status)
- [x] `bootstrap.ts` — `attestationsDeps?: AttestationsRouterDeps` option mirrors W9/W10 pattern
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/attestations-vertical.test.mjs` — **8/8** (empty list, POST defaults active, bad_input 400, bad_status 400, frameworkId+status filter narrows from 3→1, PATCH 200 + audit before/after, PATCH on missing 404, permission 403 on write)
- [x] Full suite — **106/106 pass**

### W14 Gate Evidence — COMPLETE
- [x] `application/gaps/gaps.service.ts` — tenant-scoped CRUD + `updateGapStatus` over `<tenant_schema>.compliance_gaps`; strict `tenant_<id>` schema regex; `gap_status` enum `open|in_remediation|closed|accepted`; `compliance_level` enum `fully_compliant|partially_compliant|non_compliant|not_applicable`; required-field validation `bad_input`
- [x] `interface/http/gaps.routes.ts` — sub-router on composite `/api/compliance` (`/gaps`, `/gaps/:id`, `POST /gaps`, `PATCH /gaps/:id/status`); permission gates `gap.record.read` / `gap.record.write`; audit `gap.create` and `gap.status_change` (before/after both gapStatus + complianceLevel)
- [x] `bootstrap.ts` — `gapsDeps?: GapsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/gaps-vertical.test.mjs` — **8/8** (empty list, POST defaults open/non_compliant, bad_input 400, bad_status+bad_level 400, assessmentId+gapStatus filters, PATCH 200 + audit before/after both fields, PATCH on missing 404, permission 403 on write)
- [x] Full suite — **98/98 pass**

### W13 Gate Evidence — COMPLETE
- [x] `application/requirements/requirements.service.ts` — tenant-scoped CRUD over `<tenant_schema>.compliance_requirements`; strict `tenant_<id>` schema regex; criticality enum `low|medium|high|critical`; required-field validation `bad_input`
- [x] `interface/http/requirements.routes.ts` — sub-router on composite `/api/compliance` (`/requirements`, `/requirements/:id`, `POST /requirements`); permission gates `requirement.record.read` / `requirement.record.write`; audit `requirement.create`
- [x] `bootstrap.ts` — `requirementsDeps?: RequirementsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/requirements-vertical.test.mjs` — **8/8** (empty list, POST→GET default criticality, bad_input 400, bad_criticality 400, criticality+frameworkId+search filters, audit captured, permission 403, bad_schema 400)
- [x] Full suite — **90/90 pass**

### W12 Gate Evidence — COMPLETE
- [x] `application/assessments/assessments.service.ts` — tenant-scoped CRUD + `updateAssessmentStatus`; strict `tenant_<id>` schema regex; status enum `draft|in_progress|under_review|completed|closed`; `overallScore` 0–100 range validation → `bad_input`
- [x] `interface/http/assessments.routes.ts` — sub-router on composite `/api/compliance` (paths `/assessments`, `/assessments/:id`, `POST /assessments`, `PATCH /assessments/:id/status`); permission gates `assessment.record.read` / `assessment.record.write`; audit-port writes `assessment.create` and `assessment.status_change` (before/after status + overallScore)
- [x] `bootstrap.ts` — `assessmentsDeps?: AssessmentsRouterDeps` option; composite mount stays single-prefix
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/assessments-vertical.test.mjs` — **8/8** (empty list, POST→GET, bad_input 400, bad_status 400, overallScore range 400, PATCH 200 + audit before/after, PATCH on missing 404, permission 403 on write)
- [x] Full suite — **82/82 pass**

### W11 Gate Evidence — COMPLETE
- [x] `application/obligations/obligations.service.ts` — tenant-scoped CRUD + `updateObligationStatus`; `tenant_<id>` schema regex; `bad_input` for missing required fields; `bad_status` enforcement on status enum (`active|met|overdue|waived`)
- [x] `interface/http/obligations.routes.ts` — sub-router mounted on the composite `/api/compliance` (paths `/obligations`, `/obligations/:id`, `POST /obligations`, `PATCH /obligations/:id/status`); permission gates `compliance.read` / `compliance.admin`; audit-port writes for `obligation.create` and `obligation.status_change` (with before/after diff)
- [x] `bootstrap.ts` — `obligationsDeps?: ObligationsRouterDeps` option; composite mount stays single-prefix (no manifest churn)
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/obligations-vertical.test.mjs` — **8/8** (empty list, POST→GET, bad_input 400, bad_status 400, PATCH 200 + audit before/after, PATCH on missing 404, search filter, permission 403 on write)
- [x] Full suite — **81/81 pass**

### W10 Gate Evidence — COMPLETE
- [x] `application/frameworks/frameworks.service.ts` — tenant-scoped `listFrameworks`/`getFramework`/`createFramework` over `<tenant_schema>.compliance_frameworks`; strict `tenant_<id>` schema regex; UNIQUE(tenant_id, code) duplicate-key mapped to `duplicate_code`; required-field validation maps to `bad_input`
- [x] `interface/http/frameworks.routes.ts` — REST router (`GET /` filterable list w/ search + isActive + paging, `GET /:id`, `POST /`); permission gates `framework.record.read` / `framework.record.write`; audit-port write on create; per-request counter `compliance_frameworks_requests_total`
- [x] `bootstrap.ts` — `frameworksDeps?: FrameworksRouterDeps` option; when supplied flips `/api/frameworks` mount to `wired=true`
- [x] `tsconfig.json` includes 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/frameworks-vertical.test.mjs` — **8/8** (mount wired, empty list, POST→GET roundtrip + duplicate 409, bad_input 400, search filter, permission 403 read+write, audit captured, schema-injection 400)
- [x] Full suite — **73/73 pass**

### W9 Gate Evidence — COMPLETE
- [x] `application/controls/controls.service.ts` — tenant-scoped `listControls`/`getControl`/`createControl` over `<tenant_schema>.compliance_controls`; strict `tenant_<id>` schema regex (rejects injection attempts with `bad_schema`)
- [x] `interface/http/controls.routes.ts` — REST router (`GET /` list+filter+page, `GET /:id`, `POST /` create); permission gate via host-supplied `hasPermission` (`compliance.read` for read, `compliance.admin` for write); audit-port write on create (best-effort)
- [x] `bootstrap.ts` — when `controlsDeps` supplied, `routers['/api/controls']` is auto-mounted; flips aggregator mount surface from 501 placeholder to `wired=true`
- [x] `tsconfig.json` includes the 2 new TS files; clean rebuild green
- [x] `index.ts` exports the service + router factory + types
- [x] `tests/integration/controls-vertical.test.mjs` — **6/6** (mount wired, empty list, POST→GET roundtrip, permission 403 on read+write, audit write captured, schema-injection rejected with 400)
- [x] Full suite — **65/65 pass**
- [x] Aggregator surface: `/api/controls` is the first non-`/api/compliance` prefix flipped from 501 to real handler — vertical-slice template the remaining 21 prefixes will follow

### W8 Gate Evidence — COMPLETE
- [x] `application/observability/metrics.ts` — counter/gauge registry with labels (`incCounter`, `setGauge`, `snapshot`); no Prometheus-client dep (Problem 10 — observability honesty)
- [x] `application/observability/health.ts` — `reportHealth()` rolls up checks (db / foundation / dynamic-ui / ai), unbound-port detection downgrades to `warn` unless `requireX:true`; `reportLiveness()` stays decoupled from external state
- [x] `interface/http/health.routes.ts` — `GET /healthz` (200 always), `GET /readyz` (503 on `fail`, 200 on warn/pass), `GET /metrics` (JSON snapshot)
- [x] `bootstrap.ts` — composite router auto-mounts health router by default; request-counter middleware bumps `compliance_http_requests_total{method=…}` for every `/api/compliance` request
- [x] `tsconfig.json` includes the 3 new TS files; clean rebuild green; `dist/application/observability/` populated
- [x] `index.ts` exports `incCounter`, `setGauge`, `metricsSnapshot`, `reportHealth`, `reportLiveness`, `createHealthRouter` and types
- [x] `tests/integration/health-metrics.test.mjs` — **8/8** (liveness, readiness warn-on-unbound, readiness fail-when-required, all-bound pass, /healthz 200, /readyz 503 when required dep fails, /metrics surfaces request counter, programmatic counter snapshot)
- [x] Full suite — **59/59 pass**

### W7 Gate Evidence — COMPLETE
- [x] `db/public/migrations/142_export_jobs.sql` — `compliance_export_jobs` (status/progress/result_url/error tracking) with tenant + status indexes
- [x] `ports/ai.port.ts` — narrow `AiPort` (suggest/interpretQuery/classify); fail-closed unbound (`bindAiPort` discipline)
- [x] `application/export/export.service.ts` — `runSyncExport` (registered emitter), `startAsyncExport` (persists job, runs emitter with progress callback, optional uploader → download URL); error path captures `code/message`
- [x] `application/realtime/realtime.service.ts` — in-process SSE pub/sub keyed by `(tenantId, scopeType)`; `subscribe`/`publishEvent`/`__resetForTest`; tenant-isolated channels (no cross-tenant bleed)
- [x] `interface/http/export.routes.ts` — POST `/export/single|/async`, GET `/export/jobs/:id|/download` (302 redirect to signed URL or 409 if not ready)
- [x] `interface/http/realtime.routes.ts` — GET `/events/:scopeType` SSE (writes `event: ready` then live frames), POST `/events/:scopeType/publish`
- [x] `interface/http/ai.routes.ts` — POST `/ai/suggestions/list|/query/interpret|/classify`; returns **503 ai_unavailable** when port unbound (no fake AI scores — Problem 6 honesty)
- [x] `bootstrap.ts` — `aiPort`/`exportDeps`/`realtimeDeps`/`aiDeps` host options; composite router on `/api/compliance` mounts each conditionally
- [x] `tsconfig.json` includes 6 new TS files; build green
- [x] `index.ts` exports the AI/export/realtime surfaces (ports, services, router factories, types)
- [x] `tests/integration/export-realtime-ai.test.mjs` — **7/7** (sync export inline body, unknown emitter 404, async lifecycle to succeeded + download redirect, tenant-scoped job read 404, SSE delivery + cross-tenant isolation, AI 503 when unbound, AI 200 when bound)
- [x] Full suite — **51/51 pass**


### W6 Gate Evidence — COMPLETE
- [x] `ui/component-registry.ts` — `COMPLIANCE_COMPONENT_KEYS` (26 entries) sourced from W1.5 seed manifest; readiness lifecycle `READY|PARTIAL|STUB|BLOCKED`; permission keys mapped from seed (Problem 2 — runtime config)
- [x] `application/ui/register-components.ts` — `registerComplianceComponents()` dispatches to bound Dynamic UI port (Problem 5/6)
- [x] `interface/http/ui-discovery.routes.ts` — `GET /api/compliance/ui/components`, `GET /api/compliance/ui/components/:key`
- [x] `bootstrap.ts` — composite Express router on `/api/compliance` (UI discovery always; runtime-config when supplied); aggregator marks `/api/compliance` wired by default
- [x] `index.ts` exports component registry, key listers, registration helper, ui-discovery router factory
- [x] `tsconfig.json` includes 3 new files; build green; JSON seed copied into `dist/db/seeds/dynamic-ui/index.json` automatically by `resolveJsonModule`
- [x] Aggregator W1 tests updated to reflect new wired-by-default `/api/compliance`
- [x] `tests/integration/ui-discovery.test.mjs` — 5/5 (registry parity, GET full, GET single + 404, port dispatch, default mount wired)
- [x] Full suite — **44/44 pass**

### W5 Gate Evidence — COMPLETE
- [x] `db/public/migrations/140_module_config.sql` — `compliance_module_config` (kind/type/version, tenant_id NULL=template) + `compliance_user_view_preferences` (user-scoped views, sharing arrays)
- [x] `application/runtime-config/runtime-config.service.ts` — `getConfig` (tenant-row-first, template fallback), `saveConfig` (idempotent upsert), `listViews`, `saveViewPreset`, `shareViewPreset`, `deleteViewPreset`; cache key includes `tenantId` (no cross-tenant bleed)
- [x] `interface/http/runtime-config.routes.ts` — REST router: GET/PUT `/runtime-config/:kind/:type`, GET `/views/:scopeType`, PUT/POST(share)/DELETE `/views/:scopeType/:viewKey`; tenant+actor resolved via host-supplied `resolveContext`
- [x] `bootstrap.ts` — auto-mounts the runtime-config router on `/api/compliance` when `options.runtimeConfig` is supplied; mount surface flips `wired=true`
- [x] `index.ts` exports service functions, router factory, types
- [x] `tsconfig.json` includes the 2 new TS files; build green
- [x] Replaces the previously empty `switchView`/`saveViewPreset`/`shareView` placeholders (Problem 7)
- [x] `tests/integration/runtime-config.test.mjs` — 6/6 (404→200, bad kind 400, tenant-overrides-template, share to peer, delete idempotency, mount wired)
- [x] Full suite — **39/39 pass**

### W4 Gate Evidence — COMPLETE
- [x] `ops/scripts/extract-security-catalog.mjs` — extracts COMPLIANCE_PERMISSIONS / COMPLIANCE_ROLES / COMPLIANCE_SOD_RULES from TS into JSON (no `@dos/types` runtime dep)
- [x] `interface/security/compliance.permissions.json` (41 perms), `compliance.roles.json` (8 roles), `compliance.sod.json` (5 rules) — generated, source-of-truth for runtime publisher
- [x] `interface/security/publish.ts` — locally-typed `PermissionRow / RoleRow / SodRuleRow` (no workspace dep)
- [x] `publishComplianceCatalog(client)` — idempotent transactional upsert into `platform_dauth.permissions` (ON CONFLICT) + `functional_roles.permissions[]` array union + `compliance_sod_rules` table create+upsert; mirrors Foundation's 006 seed pattern
- [x] `evaluateComplianceSoD(input)` — delegates to `getFoundationPort().evaluateSoD()`; falls back to in-process action-vs-rule evaluation only when port unbound
- [x] `index.ts` exports publisher, evaluator, loaders, and types
- [x] `tsconfig.json` includes `interface/security/publish.ts`; build green (0 errors)
- [x] `tests/integration/permissions-publish.test.mjs` — 5/5 (catalog shape, publish stream, rollback on error, port delegation, fallback)
- [x] Full suite — **33/33 pass**

### W3 Gate Evidence — COMPLETE
- [x] `db/lifecycle.ts` — orchestrator with `installPublic` / `installTenant` / `seedPublic` / `seedTenant` / `bootstrapCompliance`
- [x] **Two-ledger split**: `compliance_public_migrations` (tenant_id NULL) and `compliance_tenant_migrations` (tenant_id scoped) — fixes single-ledger collision risk
- [x] Auto-creates tenant schema `tenant_<id>` and renders `__TENANT_SCHEMA__` placeholders
- [x] Default exclusions: `*_down.sql` rollbacks + `.py` helpers never applied
- [x] Public seeds runner pulls `db/seeds/dynamic-ui/*.sql` (W1.5) and `db/seeds/public/*.sql` with directory-prefixed names
- [x] Tenant seeds dir scaffolded (`db/seeds/tenant/`)
- [x] `index.ts` exports lifecycle + types
- [x] `tsconfig.json` includes `db/lifecycle.ts`
- [x] `tests/integration/db-lifecycle.test.mjs` — **6/6** (apply, idempotency, schema rendering, two-tenant isolation, seed prefixing, bootstrap composition)
- [x] Full suite — **28/28 pass**

### W2 Gate Evidence — COMPLETE
- [x] `ports/foundation.port.ts` — `FoundationPort` (lookups, resolveOrgScope, writeAudit, evaluateSoD); fail-closed unbound; bindFoundationPort merges
- [x] `ports/dynamic-ui.port.ts` — `DynamicUiPort` (getEnrollment, registerComponents, invalidateRouteCatalog); fail-closed unbound
- [x] `ports/audit.port.ts` — narrow `AuditPort` defaulting to Foundation.writeAudit; bindAuditPort allows direct override
- [x] `ports/contract-ports.ts` — barrel of W2 ports (W2 only — does NOT pull legacy `@dos/*` re-exports)
- [x] `bootstrap.ts` — `RegisterComplianceOptions` typed `foundation: Partial<FoundationPort>` / `dynamicUi: Partial<DynamicUiPort>` / `audit: Partial<AuditPort>`; bindings flow through `bindCompliancePorts()`
- [x] `index.ts` — public barrel re-exports the 3 ports + types
- [x] `tsconfig.json` includes the 4 new TS files
- [x] `tests/integration/ports-binding.test.mjs` — 5/5 (unbound rejects, host bindings install, audit defaults to foundation, register options propagate)
- [x] Full suite — **22/22 pass**

### W1.5 Gate Evidence — COMPLETE
- [x] `db/seeds/dynamic-ui/001_seed_compliance_module.sql` — registers `compliance` in `dos.dynamic_ui_modules` (default_tenant_enrollment_status='not_enrolled', honest)
- [x] `db/seeds/dynamic-ui/002_seed_compliance_nav_routes_shell.sql` — 1 nav entry, 26 SPA routes (incl. catch-all), shell layout
- [x] `db/seeds/dynamic-ui/003_seed_compliance_route_permissions.sql` — derives route_permissions rows from `permission_key` columns (idempotent)
- [x] `db/seeds/dynamic-ui/004_seed_compliance_readiness.sql` — marks all rows `STUB` until W6 flips per-page
- [x] `db/seeds/dynamic-ui/index.json` — manifest declaring order, componentKeys allowlist, permissions referenced
- [x] `tests/integration/dynamic-ui-seed-shape.test.mjs` — 6/6 pass; verifies file order, INSERT shape, catch-all presence, component_key allowlist, readiness, ON CONFLICT
- [x] Full suite — 17/17 pass

### W1 Gate Evidence — COMPLETE
- [x] `bootstrap.ts` rewritten with `RegisterComplianceOptions/Result`, `routers` override map, lifecycle hooks
- [x] `interface/http/aggregator.routes.ts` builds 22 mounts data-driven from `manifest.routeBases`
- [x] Unwired prefixes return HTTP **501** with structured `{module, version, routeBase, requestedPath}` (not silent 404)
- [x] Introspection endpoint `GET /__compliance/mounts` returns mount table
- [x] Host-supplied `routers['/api/controls']` override verified (mount.wired=true, custom 200 served)
- [x] Legacy `interface/server.ts` moved to `examples/standalone-server.ts.legacy`
- [x] `tests/integration/aggregator-mounts.test.mjs` — 4/4 pass
- [x] Combined smoke + integration — 11/11 pass
- [x] `package.json` adds `test:integration` script and includes integration in `test`

### W0 Gate Evidence — COMPLETE
- [x] Folder renamed `Complaince Module` → `Compliance Module`
- [x] `pnpm-workspace.yaml` updated (added Compliance + Foundation)
- [x] `dist/` and 99 committed `*.js` / `*.d.ts` / `*.js.map` siblings of `*.ts` removed
- [x] 33 three-line stubs in `application/compliance/*.ts` deleted (subdirectory implementations preserved)
- [x] `tsconfig.json.original` artefact removed
- [x] `tsconfig.build.json` builds cleanly via `npx tsc -p tsconfig.build.json` (0 errors)
- [x] `node --test tests/smoke/compliance.smoke.test.mjs` → 7 pass / 0 fail
- [x] `.gitignore` added (dist, node_modules, etc.)

## Locked References
- **Foundation Module** v2.0.0 — `/root/DOS-AIO/DOS Platform/Foundation Module/` (do not modify)
- **Dynamic UI** v0.1.0 — `/root/DOS-AIO/DOS Platform/Dynamic UI/` (do not modify)

---

## CONSOLIDATED ACTION PLAN — Memory Snapshot (post-W47)

This section is the persistent, follow-up-ready record of every step, conversation, and forward commitment for the Compliance Module workstream. All prior chat context that was summarized at session compaction is restated here so future sessions can resume without re-reading the chat log.

### A. Authorization & Scope (locked)
- **Scope** — strictly `/root/DOS-AIO/DOS Platform/Compliance Module/`. No edits to `Foundation Module/` (v2.0.0) or `Dynamic UI/` (v0.1.0); both are locked references.
- **Execution mode** — full sequential delegation; no per-wave approval; no subagent usage; trust this agent directly.
- **Commits** — agent commits and pushes after each completed wave to `origin/main`.
- **Memory ownership** — every wave/conversation logged here as the single source of truth.

### B. Cumulative Wave Ledger (W0 → W47, all COMPLETE)
| Phase | Waves | Theme |
|---|---|---|
| 1 | W0–W8 | Skeleton, bootstrap, ports (foundation/dynamic-ui/audit/ai), DB lifecycle (`tenant_<id>` + SQL-injection regex `^tenant_[A-Za-z0-9_]+$`), 41 perms / 8 roles / 5 SoD rules, runtime config + view-presets, UI registry, export/realtime/AI routers, health/metrics |
| 2 | W9–W14 | controls, frameworks, obligations, assessments, requirements, gaps |
| 3 | W15–W19 | attestations (top-level), exceptions, evidence-links, regulatory-changes, monitoring |
| 4 | W20–W25 | posture-scores, roadmap, calendar, programs, controls-mapping, kpis |
| 5 | W26–W33 | settings, attachments, comments, tags, change-log, external-mappings, report-snapshots, ai-suggestions |
| 6 | W34–W37 | versions, control-deficiencies, control-effectiveness, control-scope-tags |
| 7 | W38–W40 | control-test-schedules, attestation-campaigns, attestation-records |
| 8 | W41–W44 | attestation-drafts, csa-campaigns, csa-responses, ucf-controls |
| 9 | W45–W47 | crosswalk-mappings, sod-conflict-matrix, entities |

**Test progression**: 306 (W40) → 314 → 322 → 330 → 338 → 347 → 356 → **365/365** (W47).
**39 sub-verticals** mounted on composite `/api/compliance` plus 3 top-level routers (`/api/controls`, `/api/frameworks`, `/api/compliance-attestation`).

### C. Vertical-Slice Pattern (the contract every new vertical must satisfy)
1. `application/<slice>/<slice>.service.ts` — pure DB-facing service over `<tenant_schema>.<table>`; `assertSchema()` regex guard; typed enums; `bad_input`/`bad_<enum>`/`bad_schema` error codes.
2. `interface/http/<slice>.routes.ts` — Express sub-router; `resolveContext(req)`→{tenantId,userId,tenantSchema,hasPermission}; `requirePerm` gate; `getAuditPort().write()` for create/update/status/delete; `incCounter('compliance_<slice>_requests_total')`.
3. `bootstrap.ts` — add `<slice>Deps?` option + `composite.use(create<Slice>Router(options.<slice>Deps))`.
4. `tsconfig.json` — include both new `.ts` files.
5. `index.ts` — barrel-export service symbols + router factory + types.
6. `tests/integration/<slice>-vertical.test.mjs` — mock `DbClient` with SQL `startsWith`/`includes` matching; cover empty list, POST defaults+audit, bad_input, enum guards, PATCH transitions, list filters narrowing, DELETE 204→404, permission gate denies write.
7. Build: `rm -rf dist && npx tsc -p tsconfig.build.json`.
8. Test: `node --test 'tests/integration/'*.test.mjs`.
9. Commit + push.

### D. KSA Market Gap Map (to lead the KSA compliance market)
1. **Regulatory Content Packs** — first-class importable framework packs:
   - **NCA** — ECC-2:2024, CCC, CSCC (Cloud Cybersecurity Controls), OTCC (OT Cybersecurity Controls), DCC (Data Cybersecurity Controls), TCC.
   - **SAMA** — Cyber Security Framework (CSF), BCM, IT Outsourcing.
   - **PDPL** — primary law + Implementing Regulations + Data Transfer Regulations (DTR).
   - **CITC** — RDPP, CRF.
   - **ZATCA** — e-invoicing.
   - **MOH NABIDH/SEHA**, **Aramco SACS-002**, **CMA**.
2. **Arabic-First Bilingual UX & Reporting** — RTL UI, AR/EN content for every requirement/control, AR PDF/Excel exports.
3. **Regulator-Submission Workflows** — NCA submission packets, SAMA cyber-maturity submissions, PDPL DPIA + breach notification within statutory windows.
4. **New Verticals Required** — `findings`, `evidence_files` (binary), `instrument_structure` (legal hierarchy: act→chapter→article→clause), `workspaces`, `sectors`, `framework_sector_applicability`, `framework_dependencies`, `regulator_bulletins`, `submission_packets`, `bilingual_content`, `compliance_universe`, `compliance_calculator`.
5. **Continuous Compliance / Automation** — connector-driven evidence harvest, drift detection on control config.
6. **Maturity & Benchmarking** — ECC maturity scoring 1–5, sector benchmarks.
7. **Identity / SoD Depth** — leverage W46 matrix to evaluate user role-pairs at runtime against incoming SoD events.
8. **Third-Party / Supply-Chain** — vendor↔framework applicability fan-out.
9. **Privacy first-class** — PDPL DPIA, ROPA, breach 72h workflows, cross-border transfer impact.
10. **Operational Hardening** — tenant-isolated cache keys, structured logs, Prom metrics per slice (already partially in place).
11. **Demo Differentiators** — pre-loaded Saudi tenant fixture, NCA/SAMA exemplars, Arabic walkthrough.

### E. Cross-Module Integration Map (18 sibling modules)
Compliance is the **vertical authority** for frameworks/controls/obligations/attestations/CSA/SoD/entities/crosswalk. Pairwise wiring it must publish or subscribe:

| Counterparty | Compliance publishes | Compliance subscribes |
|---|---|---|
| ksa-regulatory | `compliance.assessment_completed` | `ksa_regulatory.change_detected`, `ksa_regulatory.mapping_updated`, `ksa_regulatory.obligation_status_updated` |
| Risk | `compliance.gap_detected`, `compliance.posture_changed` | `risk.residual_high`, `risk.appetite_breached` |
| Evidence | `compliance.assessment_completed` | `evidence.collected`, `evidence.coverage_low`, `evidence.review_rejected` |
| Policy | `compliance.framework_attached` | `policy.approved`, `policy.expired` |
| Privacy | `compliance.posture_changed` | `privacy.dsr_overdue`, `privacy.breach_detected` |
| Vendor | `compliance.requirement_changed` | `vendor.risk_changed`, `vendor.dd_completed` |
| Audit | `compliance.finding_created` (planned) | `audit.finding_created` |
| Training | `compliance.attestation_required` | (none required) |
| Workflow | (uses port) | `workflow.status_changed` |
| BCP | `compliance.requirement_attached` | `bcp.crisis_declared` |
| Incident | (none) | `incident.classified`, `incident.breach_reported` |
| DORA | `compliance.framework_attached` | `dora.ict_risk_assessed`, `dora.major_incident_reported` |
| Governance | `compliance.exception_approved` | `governance.health_score_updated` |
| Remediation | `compliance.gap_detected` | `remediation.action_completed` |
| Analytics | (consumed read-side) | (none) |
| AGRC-engine | (consumed read-side) | (none) |
| Qiyas | `compliance.score_updated` | (none) |
| grc-query | (consumed read-side) | (none) |

### F. Forward Wave Plan (W48+)
Sequenced; each wave still vertical (service + router + bootstrap + tsconfig + index + integration test + commit/push):
- **W48 Findings** — `<tenant>.findings` (severity, source=internal|regulator, status pipeline, link to controls/requirements/gaps).
- **W49 Evidence-Files** — binary upload metadata + hash + retention; integrates with audit port.
- **W50 Workspaces** — multi-workspace per tenant scoping for very-large groups.
- **W51 Instrument-Structure** — `instruments → chapters → articles → clauses` hierarchy under `<tenant>.instrument_structure`; resolves PDPL/ECC clause-level mapping.
- **W52 Sectors + Framework-Sector-Applicability** — drives NCA/SAMA framework selection by sector code.
- **W53 Regulator-Bulletins** — ingest stream for change radar.
- **W54 Submission-Packets** — packet builder (export-driven) for NCA / SAMA / PDPL submissions.
- **W55 Bilingual-Content** — `bilingual_content(entity_type, entity_id, locale, field, value)` plus Accept-Language negotiation in router base.
- **W56 Compliance-Universe** — denormalized rollup view per tenant.
- **W57 Compliance-Calculator** — maturity & posture computation engine.
- **W58 KSA Content-Pack Loader** — NCA/SAMA/PDPL/CITC seed under `db/seeds/ksa/`.
- **W59 Continuous-Compliance Drift** — periodic drift events from `monitoring` table → `compliance.drift_detected`.
- **W60 Cross-Module Event Publisher** — outbox table + adapter for `compliance.*` events listed in §E.
- **W61 SoD Runtime Evaluator** — at-grant check against `sod_conflict_matrix` (W46) for foundation role assignment.
- **W62 Findings → Remediation Bridge** — auto-create remediation actions on finding open.
- **W63 Hardening Pass** — tenant cache key audit; Prom metric coverage; structured logger envelope.

### G. Definition-of-Done per future wave
- Service has `assertSchema` + typed enums + `bad_input`/`bad_<enum>` errors.
- Router has `requirePerm` gate + audit writes on mutation paths.
- bootstrap.ts wires `<slice>Deps`.
- tsconfig.json includes both new TS files.
- index.ts barrel-exports service + router + types.
- Integration test ≥ 8 cases including permission-gate negative.
- Suite remains green; new total recorded in §B table.
- Wave row added to `## Wave Status` table at top of this file.
- Gate Evidence sub-section appended.
- Commit + push.

### H. Open Risks / Watchlist
- `db/canonical/tenant/obligations.sql` declares `entities` and `sod_conflict_matrix` with **shorter** column shape than the runtime services use (`id`, `tenant_id`, `created_at` only). Real tenant migration must be added under `db/tenant/migrations/` before first prod deploy. (Tracked for W63 hardening.)
- Composite `/api/compliance` is heavy (39 sub-routers); consider lazy-mount once we exceed ~60 verticals.
- `crosswalk_mappings` migration (003) constrains `target_requirement_id TEXT` and FK on `source_control_id` to `ucf_controls`; integration test mock does not enforce FK — production seed must.
- Foundation port is still default (no real adapter bound by host yet) — production wiring tracked separately.

### I. How to resume next session
1. Read this `AGENT-MEMORY.md` end-to-end.
2. Re-read `bootstrap.ts`, `tsconfig.json`, `index.ts` for current shape.
3. Pick next wave from §F (W48 Findings).
4. Apply §C pattern.
5. Update §B test progression and add §F/§B/Gate-Evidence rows.
6. Commit + push.
