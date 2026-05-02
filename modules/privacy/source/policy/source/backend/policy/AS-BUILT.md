# Policy Module — AS-BUILT Ledger

## Module Identity

| Field | Value |
|-------|-------|
| Module Code | `policy` |
| Spec | MP-07 (`DOS-AIO-Specs/module-patch-07-policy-end-to-end.md`) |
| Layer | Core business domain module |
| Criticality | P0 — governance foundation |
| Product Owner | `shahin` |
| Route Base | `/api/policies`, `/api/policy-*` (14 mount paths) |

## Owned Artifacts

### Backend Services
- Policy core, library, versioning, publication, attestation, exception, linkage, analysis
- Impact simulator, gap detector, notification, reporting, dashboard
- Workflow integration, template catalog/guidance/workflow/query/MoM
- AI integration, control propagator
- Admin and diagnostics services

### Backend Routes (14 registered in policy-routes.catalog.ts)
- `/api/policy-code`, `/api/policies`, `/api/policy-lifecycle`, `/api/policy-templates`
- `/api/attestation`, `/api/policy-overview`, `/api/policy-exceptions`
- `/api/policy-publications`, `/api/policy-coverage`, `/api/policy-reports`
- `/api/policy-analysis`, `/api/policy-impact`, `/api/policy-admin`, `/api/policy-diagnostics`

### Security
- Permissions, roles, SoD, approval matrix defined in `security/`
- DAuth lifecycle enforcement on all protected transitions

### Events
- Subscribers registered in `agrc-event-subscribers.ts`
- Publishers/subscribers in `policy.events.ts`

### Jobs
- `policy-review-check` registered in agrc-jobs.ts (daily at 7 AM)

### Diagnostics
- `policy-diagnostics.service.ts` with health checks
- Route registered at `/api/policy-diagnostics`

### Admin
- Admin routes at `/api/policy-admin`

### i18n Coverage
| File | Keys | Status |
|------|------|--------|
| `i18n/en.json` | 32 | Complete |
| `i18n/ar.json` | 32 | Complete |

## Hardening Notes
- Policy diagnostics route was missing from catalog — added (order 243)
- 23 service wrapper files follow Law 1 re-export pattern
- i18n folder created with full bilingual coverage

## Known Risks
1. Large service count (23 wrappers + core implementations) — monitor for split needs
2. Policy template subsystem is complex (5 template services) — ensure clear ownership
