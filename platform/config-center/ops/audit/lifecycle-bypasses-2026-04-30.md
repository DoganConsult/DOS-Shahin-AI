# Lifecycle Transition Bypass Tracker — 2026-04-30

**Rule (P1-1):** Every protected lifecycle transition MUST flow through
`evaluateLifecycleTransition()` ([platform/dauth/packages/shared/src/lifecycle/index.ts](../../platform/dauth/packages/shared/src/lifecycle/index.ts))
followed (where applicable) by `initiateApproval()` from the workflow service.

A direct `UPDATE ... SET (status|state|lifecycle_state) = ...` on any
stateful column that bypasses these helpers is a **fail condition** for
Phase 1 platform readiness.

## Scope

`grep` shows the following raw `UPDATE ... SET status|state|lifecycle_state`
counts (excluding tests, dist, migrations):

| Area                 | Count |
|----------------------|------:|
| platform/            |    90 |
| modules/             |   154 |
| Onboarding Module/   |    51 |
| Evidence Module/     |    16 |
| Audit Module/        |    11 |
| Risk Module/         |    11 |
| Incident Module/     |    11 |
| Training Module/     |     7 |
| Policy Module/       |     4 |
| **Total**            | **355** |

Not every match is a true bypass — the canonical `transitionStatus()` helper
itself runs an `UPDATE ... SET status = $1`. Those are legitimate when reached
via `evaluateLifecycleTransition`. True bypasses are direct UPDATEs in route
handlers, repos, or service methods that DO NOT first call the lifecycle
helper.

## High-priority hotspots (audit user-facing surfaces first)

These are call-sites where a route handler or service mutates state without
the lifecycle gate. Fixing these first protects the majority of user-visible
flows.

### Onboarding — SoD action routes (7 sites)
[Onboarding Module/services-onboarding-service/src/routes/sod-actions.routes.ts](../../Onboarding%20Module/services-onboarding-service/src/routes/sod-actions.routes.ts)
- `:168` `UPDATE dos.workflow_tasks SET status = 'completed'` — approve flow
- `:223` `UPDATE dos.workflow_instances SET status = $1` — instance close
- `:230` `UPDATE dos.workflow_approvals SET status = 'approved'` — approver decision
- `:238` `UPDATE dos.workflow_tasks SET status = $1` — task close
- `:323` `UPDATE dos.workflow_instances SET status = 'rejected'` — reject flow
- `:327` `UPDATE dos.workflow_approvals SET status = 'rejected'` — approver decision
- `:333` `UPDATE dos.workflow_tasks SET status = 'cancelled'` — cancel flow
**Action:** wrap each route in `evaluateLifecycleTransition({ moduleCode: 'onboarding', entityType: 'workflow_task'|'workflow_instance'|'workflow_approval', fromState, toState, permissionCode: 'workflow.approve' })` and only proceed on `allowed:true`.

### Onboarding — repo + lifecycle/workflow services (4 sites)
- [Onboarding Module/modules-onboarding/source/backend/onboarding/repositories/onboarding-session.repo.ts:102-124](../../Onboarding%20Module/modules-onboarding/source/backend/onboarding/repositories/onboarding-session.repo.ts#L102-L124) — 3× UPDATE for `approved_for_provisioning`, `provisioning`, generic
- [Onboarding Module/modules-onboarding/source/backend/onboarding/services/onboarding-lifecycle.service.ts:48](../../Onboarding%20Module/modules-onboarding/source/backend/onboarding/services/onboarding-lifecycle.service.ts#L48) — generic SET status
- [Onboarding Module/modules-onboarding/source/backend/onboarding/services/onboarding-workflow.service.ts:44](../../Onboarding%20Module/modules-onboarding/source/backend/onboarding/services/onboarding-workflow.service.ts#L44) — `onboarding_sessions SET status`
- [Onboarding Module/modules-onboarding/source/backend/onboarding/services/provisioning-steps/seed-compliance-steps.ts:350](../../Onboarding%20Module/modules-onboarding/source/backend/onboarding/services/provisioning-steps/seed-compliance-steps.ts#L350) — bulk `evidence_tasks SET status = 'ready'`

### Onboarding — provisioning rollback
[Onboarding Module/modules-onboarding/source/backend/onboarding/services/provisioning/provisioning-rollback.service.ts](../../Onboarding%20Module/modules-onboarding/source/backend/onboarding/services/provisioning/provisioning-rollback.service.ts) — directly UPDATEs tenants, workspaces, memberships status during rollback.
**Note:** rollback may legitimately need to bypass (we are undoing a state). Document the bypass as approved with a `// LIFECYCLE-EXEMPT: rollback path` comment + a permission gate.

### Journey
- [Onboarding Module/journey/source/backend/journey/repositories/auto-extracted.repo.ts:266](../../Onboarding%20Module/journey/source/backend/journey/repositories/auto-extracted.repo.ts#L266)
- [Onboarding Module/journey/source/backend/journey/services/journey-workflow.service.ts:45](../../Onboarding%20Module/journey/source/backend/journey/services/journey-workflow.service.ts#L45)
- [Onboarding Module/journey/source/backend/journey/services/journey-lifecycle.service.ts](../../Onboarding%20Module/journey/source/backend/journey/services/journey-lifecycle.service.ts)

### Risk Module (5 services, 11 sites)
- application/risk-treatment.service.ts
- domain/risk/services/risk-lifecycle.service.ts
- domain/risk/services/core/risk-register.service.ts
- domain/risk/services/scoring/risk-assessment.service.ts
- domain/risk/services/workflow/risk-campaign.service.ts
- domain/risk/repositories/auto-extracted.repo.ts

### Audit Module (4 services, 11 sites)
- source/backend/audit/services/audit-lifecycle.service.ts
- source/backend/audit/services/audit/planning/audit-prep.service.ts
- source/backend/audit/services/audit/reporting/audit-capa-effectiveness.service.ts
- source/backend/audit/repositories/auto-extracted.repo.ts
- source/backend/audit/routes/audit/operations/audit-packages.routes.ts

(Policy / Evidence / Incident / Training / modules — same pattern; full list available via the methodology below.)

## Methodology to enumerate remaining bypasses

```bash
cd "DOS Platform"
grep -rEn 'UPDATE [^'\'']+SET (status|state|lifecycle_state)[ =]' \
  platform/ modules/ "*Module/" \
  --include='*.ts' \
  | grep -v node_modules | grep -v dist \
  | grep -v '\.test\.' | grep -v '\.spec\.' \
  | grep -v '/migrations/'
```

For each match, classify into one of:
- **A — bypass to remove**: replace with `evaluateLifecycleTransition() → updateStateAfterAuth()`
- **B — canonical lifecycle UPDATE**: leave (this IS the helper)
- **C — exempt path**: rollback / migration / repair / data-fix; mark with `// LIFECYCLE-EXEMPT: <reason>` and gate on a specific permission

## Wave B execution order

1. **W-B.6.a** Onboarding SoD-action routes — 7 sites, single PR
2. **W-B.6.b** Onboarding repo/services + journey — ~10 sites, single PR
3. **W-B.6.c** Risk Module — ~11 sites, single PR (after W-B.6.b lands so we have a worked example)
4. **W-B.6.d** Audit Module — ~11 sites, single PR
5. **W-B.6.e** Policy / Evidence / Incident / Training — bundled, ~38 sites, single PR
6. **W-B.6.f** modules/ — staged in 3 sub-PRs (compliance / workflow / governance)
7. **W-B.6.g** platform/ canonical helpers stay; only flag false-positive bypasses

## Verification once complete

```bash
# After each W-B.6.* PR, the following count for that area should monotonically decrease:
grep -rEn 'UPDATE [^'\'']+SET (status|state|lifecycle_state)[ =]' <area>/ \
  --include='*.ts' | grep -v 'evaluateLifecycleTransition\|LIFECYCLE-EXEMPT\|/migrations/' | wc -l
```

A site is considered closed when either:
1. The handler/repo first calls `evaluateLifecycleTransition` and the state UPDATE is unreachable on `allowed:false`, OR
2. The line carries a `// LIFECYCLE-EXEMPT: <reason>` comment AND the surrounding handler enforces a permission via `requirePermission` middleware.
