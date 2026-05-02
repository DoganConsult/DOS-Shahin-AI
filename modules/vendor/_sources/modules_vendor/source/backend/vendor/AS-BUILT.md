# Vendor Module — AS-BUILT Ledger

## Module Identity

| Field | Value |
|-------|-------|
| Module Code | `vendor` |
| Spec | MP-10 (`DOS-AIO-Specs/module-patch-10-vendor-end-to-end.md`) |
| Layer | Core business domain module |
| Criticality | P0 — third-party risk critical |
| Product Owner | `shahin` |
| Route Base | `/api/vendors`, `/api/vendor-*` (14 mount paths) |

## Owned Artifacts

### Backend Services
- Vendor core, advanced, risk analytics, risk extension
- Cyber rating, compliance sync, compliance checks, scoring
- Engagements, portal, portal messaging, issues, findings
- Dashboard, reports, workflow, lifecycle workflows
- AI integration (Claude AI, cross-agent), enhancement subscribers
- Cross-module escalation, questionnaire risk scorer
- Admin and diagnostics services

### Backend Routes (14 registered in vendor-routes.catalog.ts)
- `/api/vendors`, `/api/vendors-advanced`, `/api/vendor-risk`
- `/api/vendor-cyber-rating`, `/api/vendor-compliance-sync`, `/api/vendor-scoring`
- `/api/score-calibration`, `/api/vendor-dashboard`, `/api/vendor-engagements`
- `/api/vendor-issues`, `/api/vendor-portal`, `/api/vendor-reports`
- `/api/vendor-admin`, `/api/vendor-diagnostics`, `/api/consultant-center`

### Security
- Permissions, roles, SoD, approval matrix in `security/`
- DAuth lifecycle enforcement on all vendor transitions

### Events
- Subscribers registered in `agrc-event-subscribers.ts`

### Jobs (3 registered in agrc-jobs.ts)
| Job | Cron | Purpose |
|-----|------|---------|
| `vendor-reassessment-check` | `0 8 * * *` | Daily reassessment check |
| `vendor-contract-expiry` | `0 6 * * *` | Daily contract expiry check |
| `vendor-reassessment-monitor` | `0 9 * * *` | Daily reassessment monitoring |

### Diagnostics
- `vendor-diagnostics.service.ts` (196 lines) — deep health checks covering schema, tables, assessments, contracts, findings, SLAs

### i18n Coverage
| File | Keys | Status |
|------|------|--------|
| `i18n/en.json` | 31 | Complete |
| `i18n/ar.json` | 31 | Complete |

## Hardening Notes
- 8 route files were missing from vendor-routes.catalog.ts — all registered
- 2 vendor jobs were missing from agrc-jobs.ts — registered
- i18n folder created with full bilingual coverage
- 26 service wrapper files follow Law 1 re-export pattern

## Known Risks
1. 121 files — large module, monitor for sub-ownership split
2. 26 service wrappers — heavy indirection layer
3. Consultant center route shares vendor module guard — verify access isolation
