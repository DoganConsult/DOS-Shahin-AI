# Phase B — Capability Inventory (Already Built vs Net-New)

Audit of the compliance module's existing capability surface against Phase B (Waves 10-25) of `cryptic-booping-codd.md`. **Most of Phase B's infrastructure already exists** — the remaining work is wiring, hardening, and surfacing.

Source of truth: `dist/index.js` exports as of commit `c934cb9f` (2026-04-30 post-Phase-A). 77 `create*Router` exports total.

---

## §1 — Phase B requirements vs existing infrastructure

| Wave | Requirement | Status | Existing surface |
|------|------------|--------|------------------|
| **10** | Tamper-evident audit trail (hash chain) | **NEW (this commit)** | `application/audit-hash-chain/` — `appendChainedAudit`, `verifyAuditChain`, `computeEntryHash`. Migration `200_compliance_audit_hash_chain.sql` adds `prev_hash`, `entry_hash`, `chain_seq` columns. 5 unit tests pass. |
| **11** | Customer-Managed Encryption Keys (CMEK / BYOK) | DESIGN ONLY | Existing key infra: API keys + idempotency. Need: per-tenant KMS adapter (AWS KMS / Azure Key Vault / GCP KMS / HashiCorp Vault). Punted to Wave-11 implementation PR. |
| **12** | Multi-region data residency | DESIGN ONLY | `dos.tenants` table has region-related fields per memory; per-region routing not yet wired. |
| **13** | DR runbook + cross-region failover | RUNBOOK SCAFFOLD (`RUNBOOK.md` §4 has rollback + PITR sections); cross-region failover wiring punted. |
| **14** | CCM connectors P1 (AWS Config, Azure Policy, GCP Asset Inventory) | DESIGN ONLY | `infrastructure/integrations/evidence/` directory exists; cloud connector adapters not yet implemented. |
| **15** | CCM connectors P2 (Okta, ServiceNow, GitHub, Jira) | DESIGN ONLY | Same as Wave 14. |
| **16** | RegTech regulatory bulletin auto-feed | **EXISTS** | `createRegulatorBulletinsRouter`, `createRegulatoryChangesRouter`, `createSubmissionPacketsRouter`. Backend: `application/regulator-bulletins/`, `application/regulatory-changes/`. Coverage of which regulator portals are auto-polled vs manual entry needs verification. |
| **17** | Outbound webhooks | **EXISTS** | `createWebhookSubscriptionsRouter`. Service: `application/webhook-subscriptions/`. Surface: `createWebhookSubscription`, `getWebhookSubscription`, `listWebhookSubscriptions`, `changeWebhookSubscriptionStatus`, `dispatchWebhookEvent`, `listWebhookDeliveries`. HMAC signing + DLQ wired via `createDeadLetterQueueRouter`. |
| **18** | Slack / Teams / Email native integrations | **PARTIAL — DISPATCHER EXISTS** | `createNotificationDispatcherRouter`. Service: `application/notification-dispatcher/` exposes `enqueueNotification`, `dispatchQueued`, `markNotificationSent`, `markNotificationFailed`, `cancelNotification`, `NOTIFICATION_CHANNELS`, `NOTIFICATION_STATUSES`. Concrete Slack/Teams adapters punted. |
| **19** | Public OpenAPI + TypeScript SDK | **NEW (this commit)** | `sdk/typescript/` package `@dos/sdk-compliance` v0.1.0. `ComplianceClient` + `ControlsResource` + `FrameworksResource` + `AttestationsResource` + `DosComplianceError` + 5 domain types mirroring openapi.yaml schemas. Builds clean with system tsc. OpenAPI 3.1 spec published at `openapi.yaml` (Wave 5). |
| **20** | Python / Java / Go SDKs | DESIGN ONLY | Punted: same OpenAPI 3.1 source can drive all three. Recommend openapi-generator. |
| **21** | WCAG 2.1 AA accessibility | **NEW (this commit)** | `tests/accessibility/wcag-2.1-aa.spec.ts` — 26 page specs covering all componentKeys; Playwright + axe-core runner skeleton in `docs/wave-21-accessibility-setup.md`. Per-page audits not yet executed. |
| **22** | Mobile responsive + native apps | DESIGN ONLY | SPA breakpoints exist at frontend layer; native iOS/Android punted. |
| **23** | Tenant data export / portability | **EXISTS** | `createExportRouter`. Service: `application/export/` — `runSyncExport`, `startAsyncExport`, `getExportJob`. |
| **24** | Compliance evidence retention automation | **EXISTS** | `createRetentionPolicyRouter`. Service: `application/retention-policy/` — `runRetention`, `planEntity`, `listRetentionRuns`, `RETENTION_MODES`, `RETENTION_RUN_STATUSES`, `RETENTION_SUPPORTED_ENTITIES`, `isSupportedEntityType`. |
| **25** | Tenant hierarchy + federated compliance | DESIGN ONLY | `dos.tenants` table supports hierarchy per memory ("schema-per-tenant"). Roll-up dashboards across parent/subsidiary punted. |

---

## §2 — Beyond-Phase-B infrastructure ALREADY in compliance

These weren't called out in Phase B but exist and accelerate later phases:

| Capability | Router | Service | Phase relevance |
|-----------|--------|---------|-----------------|
| **API key auth** | `createApiKeysRouter` | `application/api-keys/` — `issueApiKey`, `verifyApiKey`, `revokeApiKey`, `hashApiKeyPlaintext`, `generateApiKeyPlaintext` | Wave 19 SDK foundation (machine-to-machine auth) |
| **Idempotency keys** | `createIdempotencyKeysRouter` | `application/idempotency-keys/` — `recordIdempotencyResult`, `lookupIdempotencyKey`, `purgeExpiredIdempotencyKeys` | Wave 17 webhook retries; Wave 19 SDK retry-safe writes |
| **Feature flags** | `createFeatureFlagsRouter` | `application/feature-flags/` — `upsertFeatureFlag`, `evaluateFeatureFlag`, `featureFlagBucket`, `FEATURE_FLAG_REASONS` | All-phase: tenant-level feature gating, A/B testing |
| **Rate-limit policies** | `createRateLimitPoliciesRouter` | per-tenant rate limits | Wave 17 webhook delivery; Wave 19 SDK throttling; abuse protection |
| **Scheduled jobs runner** | `createScheduledJobsRunnerRouter` | `application/scheduled-jobs-runner/` — `runDueScheduledJobs`, `isScheduledJobDue`, `SCHEDULED_JOB_RUN_STATUSES` | Wave 40 drift scheduler; Wave 24 retention sweeper; Wave 16 regulator polling |
| **Outbox pattern** | `createOutboxDispatcherJobRouter`, `createOutboxArchiveRouter`, `createEventPublisherRouter` | `application/outbox-dispatcher-job/`, `application/event-publisher/` — `publishEvent`, `dispatchPendingEvents`, `markDispatched`, `markFailed`, `ARCHIVE_RUN_STATUSES` | Wave 7 event handlers; Wave 17 webhooks; Wave 18 notifications |
| **Dead-letter queue** | `createDeadLetterQueueRouter` | `application/dead-letter-queue/` — `moveToDlq`, `replayDlq`, `archiveDlq`, `DLQ_STATUSES` | Resilience for all async paths |
| **Retry/backoff policies** | `createRetryBackoffPolicyRouter` | `application/retry-backoff-policy/` — `computeBackoffMs`, `planRetries`, `listRetryDecisions` | Webhook delivery, CCM connector retry, regulator submission retry |
| **Schema migration tracker** | `createSchemaMigrationTrackerRouter` | `application/schema-migration-tracker/` — `recordMigration`, `rollbackMigration`, `MIGRATION_STATUSES` | Wave 13 DR; Wave 9 deployment gate |
| **Audit log stream** | `createAuditLogStreamRouter` | `application/audit-log-stream/` — `listAuditEvents`, `countAuditEvents`, `encodeAuditCursor`, `decodeAuditCursor` | Wave 10 hash-chain consumer |
| **Workflow runtime** | `createWorkflowRuntimeRouter` | `application/workflow-runtime/` — `createDefinition`, `startInstance`, `triggerEvent`, `findTransition`, `listTransitions`, `terminateInstance`, `WORKFLOW_STATUSES` | Wave 43 workflow builder foundation |
| **SoD runtime** | `createSodRuntimeRouter`, `createSodConflictMatrixRouter` | `application/sod-runtime/`, `application/sod-conflict-matrix/` — `evaluateSod`, `deriveVerdict`, conflict-matrix CRUD | SoD-aware workflow approvals |
| **Approval matrix runtime** | `createApprovalMatrixRuntimeRouter` | `application/approval-matrix-runtime/` — `resolveApprovalChain`, `buildChain`, `executeRun` | Wave 43 |
| **Drift detector** | `createDriftDetectorRouter` | `application/drift-detector/` — `runDriftDetection`, `diffBaselineFrameworks`, `diffBaselineRequirements`, `listDriftRecords` | Wave 40 Continuous Control Monitoring |
| **Content-pack loader** | `createContentPackLoaderRouter` | `application/content-pack-loader/` — `loadContentPack`, `hashPack`, `getContentPackImport`, `listContentPackImports` | Phase C content-pack delivery (Waves 26-38) |
| **Findings remediation bridge** | `createFindingsRemediationBridgeRouter` | `application/findings-remediation-bridge/` — `createFromFinding`, `updateActionStatus` | Wave 54 finding-triage AI |
| **Compliance calculator** | `createComplianceCalculatorRouter` | `application/compliance-calculator/` — `runCalculation`, `getLatestCalculation` | Wave 50 predictive risk modeling foundation |
| **Bilingual content** | `createBilingualContentRouter` | `application/bilingual-content/` — full CRUD on bilingual records | Phase A Wave 8 + Phase G locale expansion |
| **Compliance universe** | `createComplianceUniverseRouter` | `application/compliance-universe/` — universe-node CRUD | Tenant-scoped compliance ontology |

---

## §3 — Real-world gap (Phase B remaining work)

After this commit's Wave 10, 19, 21 deliveries, what's still net-new for Phase B closure:

1. **Wave 11 — CMEK adapters**: AWS KMS / Azure Key Vault / GCP KMS / HashiCorp Vault clients + `tenant_kms_config` table. ~3-5 days.
2. **Wave 12 — Region routing**: per-tenant region affinity in pool resolver. ~2 days.
3. **Wave 13 — Cross-region failover**: active-passive replication validated by quarterly DR test. ~2 weeks (plus calendar time for replication soak).
4. **Wave 14-15 — CCM connectors**: each connector is its own adapter; 8-10 connectors = ~8-10 weeks.
5. **Wave 18 — Slack/Teams/Email adapters**: dispatcher exists; concrete adapters per channel ~3-5 days each.
6. **Wave 20 — Python/Java/Go SDKs**: openapi-generator scaffolding ~1 day per language; QA + docs ~3-5 days each.
7. **Wave 22 — Native iOS/Android apps**: not in scope until Phase G.
8. **Wave 25 — Federated compliance roll-ups**: parent/subsidiary aggregation queries + UI. ~1 week.

---

## §4 — Phase B verdict

**Surfaced**: 77 routers, ~406 endpoints, full async-resilience infra (outbox + DLQ + retry/backoff + idempotency + scheduled-jobs + workflow-runtime + SoD + approval-matrix), full feature-flagging, full rate-limiting, content-pack import.

**Net-new this Phase-B-bootstrap commit**:
- Wave 10: tamper-evident audit hash chain — implementation + migration + 5 unit tests.
- Wave 19: TypeScript SDK `@dos/sdk-compliance` v0.1.0 — 5 domain types + 3 resource classes + DosComplianceError. Builds clean.
- Wave 21: 26-page WCAG 2.1 AA spec list + Playwright/axe-core runner skeleton + 8-section setup doc.

**Remaining Phase B work**: documented above with effort estimates. Targeted as discrete follow-up PRs.

The compliance module is closer to enterprise-leading than the original audit suggested. Most of the infrastructure exists; what's missing is mostly **vendor-specific adapter implementations** (CCM connectors, KMS adapters, channel-specific notifiers) — each isolated and PR-shippable.
