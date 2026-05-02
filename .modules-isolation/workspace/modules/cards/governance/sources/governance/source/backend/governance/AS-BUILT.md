# Governance Module — AS-BUILT Ledger

## Module Identity

| Field | Value |
|-------|-------|
| Module Code | `governance` |
| Spec | MP-04 (`DOS-AIO-Specs/module-patch-04-governance-end-to-end.md`) |
| Layer | Core business domain module |
| Criticality | P0 — control and oversight critical |
| Product Owner | `shahin` |
| Route Base | `/api/governance`, `/api/governance-*` (15+ mount paths) |

## Owned Artifacts

### Backend Services (Real implementations in subdirectories)

| Service | Path | Purpose |
|---------|------|---------|
| Governance Core | `services/governance/core/governance.service.ts` | Body definitions, core CRUD |
| Charters | `services/governance/core/governance-charters.service.ts` | Charter management |
| Health | `services/governance/core/governance-health.service.ts` | Governance health scoring |
| Enforcement | `services/governance/core/governance-enforcement.service.ts` | Policy enforcement |
| Hooks | `services/governance/core/governance-hooks.service.ts` | Event hooks |
| Structure | `services/governance/structure/governance-structure.service.ts` | Governance structure management |
| Responsibilities | `services/governance/structure/governance-responsibilities.service.ts` | Responsibility assignments |
| RACI | `services/governance/structure/governance-raci.service.ts` | RACI matrix management |
| RACI Templates | `services/governance/structure/governance-raci-templates.service.ts` | RACI template library |
| Registers | `services/governance/structure/governance-registers.service.ts` | Governance register management |
| Delegations | `services/governance/structure/governance-delegations.service.ts` | Delegation tracking |
| Mandates | `services/governance/operations/governance-mandates.service.ts` | Mandate management |
| Obligations | `services/governance/operations/governance-obligations.service.ts` | Obligation tracking |
| Reviews | `services/governance/operations/governance-reviews.service.ts` | Governance reviews |
| Acknowledgements | `services/governance/operations/governance-acknowledgements.service.ts` | Acknowledgement workflows |
| Objectives | `services/governance/operations/governance-objectives.service.ts` | Strategic objectives |
| Executive Summaries | `services/governance/intelligence/governance-executive-summaries.service.ts` | Executive reporting |
| Governance OS | `services/governance/intelligence/governance-os.service.ts` | Operational intelligence |
| Board Packs | `services/governance/governance-board-packs.service.ts` | Board pack generation |
| Dashboard | `services/governance/governance-dashboard.service.ts` | Dashboard analytics |
| Diagnostics | `diagnostics/governance-diagnostics.service.ts` | Module health checks |
| AI Integration | `services/governance/governance-ai.service.ts` | AI-assisted governance |
| Gap Scanner | `services/governance/governance-gap-scanner.service.ts` | Governance gap detection |
| Maturity Assessment | `services/governance/governance-maturity-auto-assessment.service.ts` | Maturity model assessment |
| Auto Escalation | `services/governance/governance-auto-escalation.service.ts` | Automated escalation |
| Workload | `services/governance/governance-workload.service.ts` | Workload distribution |

### Backend Routes (registered in governance-routes.catalog.ts)

| Mount Path | Route File | Key Endpoints |
|------------|-----------|---------------|
| `/api/governance` | `governance-structure.routes.ts` | Core governance CRUD |
| `/api/governance-charters` | `governance-charters.routes.ts` | Charter management |
| `/api/governance-mandates` | `governance-mandates.routes.ts` | Mandate CRUD |
| `/api/governance-delegations` | `governance-delegations.routes.ts` | Delegation tracking |
| `/api/governance-obligations` | `governance-obligations.routes.ts` | Obligation management |
| `/api/governance-health` | `governance-health.routes.ts` | Health scoring |
| `/api/governance-responsibilities` | `governance-responsibilities.routes.ts` | Responsibility assignments |
| `/api/governance-raci` | `governance-raci.routes.ts` | RACI matrix |
| `/api/governance-raci-templates` | `governance-raci-templates.routes.ts` | RACI templates |
| `/api/governance-enforcement` | `governance-enforcement.routes.ts` | Enforcement actions |
| `/api/governance-reviews` | `governance-reviews.routes.ts` | Governance reviews |
| `/api/governance-acknowledgements` | `governance-acknowledgements.routes.ts` | Acknowledgements |
| `/api/governance-objectives` | `governance-objectives.routes.ts` | Strategic objectives |
| `/api/governance-executive-summaries` | `governance-executive-summaries.routes.ts` | Executive summaries |
| `/api/governance-hooks` | `governance-hooks.routes.ts` | Event hooks |
| `/api/governance-registers` | `governance-registers.routes.ts` | Governance registers |
| `/api/governance-os` | `governance-os.routes.ts` | Operational intelligence |
| `/api/governance-board-packs` | `governance-board-packs.routes.ts` | Board packs |
| `/api/governance-workload` | `governance-workload.routes.ts` | Workload distribution |
| `/api/governance/admin` | `governance-admin.routes.ts` | Admin endpoints |
| `/api/governance/diagnostics` | `governance-diagnostics.routes.ts` | Diagnostics |

### Owned Tables (tenant schema)

- `governance_bodies`, `governance_committees`, `governance_memberships`
- `governance_charters`, `governance_mandates`, `governance_obligations`
- `governance_responsibilities`, `governance_assignments`
- `governance_raci_matrices`, `governance_raci_templates`
- `governance_delegations`, `governance_registers`
- `governance_reviews`, `governance_acknowledgements`
- `governance_objectives`, `governance_decisions`
- `governance_board_packs`, `governance_meeting_minutes`
- `governance_enforcement_actions`, `governance_hooks`

## Protected Actions & DAuth Enforcement Points

| Action | Route | DAuth Gate | Approval |
|--------|-------|-----------|----------|
| Create governance body | `POST /api/governance` | `requirePermission('governance.body.create')` | No |
| Activate charter | `POST /charters/:id/activate` | `evaluateLifecycleTransition` | Yes — committee approval |
| Issue mandate | `POST /mandates/:id/issue` | `evaluateLifecycleTransition` | Yes — authority-based |
| Delegate authority | `POST /delegations` | Delegation authority check | No |
| Complete review | `POST /reviews/:id/complete` | `evaluateLifecycleTransition` | Yes — sign-off required |
| Acknowledge obligation | `POST /acknowledgements/:id/ack` | Principal identity check | No |
| Archive body | `POST /api/governance/:id/archive` | `evaluateLifecycleTransition` | Yes — executive approval |

## Security Manifest

| Dimension | Count |
|-----------|-------|
| Permissions | Auto-generated from route files |
| Roles | 8 standard (executive_owner, module_lead, committee_chair, secretary, member, reviewer, auditor, viewer) |
| SoD Rules | Defined in `security/governance.sod.ts` |
| Approval Matrix | Defined in `security/governance.approval-matrix.ts` |

## Diagnostics (Rule 6.1)

| Check | Purpose |
|-------|---------|
| Overdue reviews | Governance reviews past due date |
| Unacknowledged obligations | Obligations awaiting acknowledgement |
| Stale charters | Charters not reviewed within policy window |
| Committee membership gaps | Committees below quorum |
| Delegation expiry | Delegations approaching/past expiry |

## Scheduled Jobs

| Job | Cron | Purpose |
|-----|------|---------|
| `governance-monitor` | Configured in module | Health monitoring, gap scanning |

## Event Integration

- **Subscribers registered** in `agrc-event-subscribers.ts` line 241
- **Publishers/subscribers** defined in `governance.events.ts` and `governance.subscribers.ts`
- Lifecycle registration in `lifecycle-registration.ts`

## Admin Surfaces (Rule 6.3)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/governance/admin/config` | GET | Module configuration |
| `/api/governance/admin/config` | PUT | Update configuration |
| `/api/governance/admin/health` | GET | Health status |
| `/api/governance/admin/reseed` | POST | Reseed module data |

## i18n Coverage (Rule 2.5)

| File | Keys | Status |
|------|------|--------|
| `i18n/en.json` | 39 | Complete |
| `i18n/ar.json` | 39 | Complete |

## Hardening Notes

- **15 route wrapper files fixed**: Added `export { default }` re-exports to all wrapper files that only had `export *` (which doesn't forward default exports). Without this fix, all 15 routes would 404 at runtime.
- **32 service re-export files**: Follow Law 1 pattern — canonical implementations in subdirectories, re-exports at governance/ level for import convenience.

## Known Risks

1. **Route wrapper pattern complexity**: Two-level re-export (subdirectory → wrapper → catalog) adds indirection. New route files must include both `export *` and `export { default }`.
2. **Large module (210 files)**: Approaching the flat directory hard cap in some subdirectories. Monitor for sub-ownership split needs.
3. **170+ migrations**: Accumulated from iterative development. Consider consolidation.
