# Audit Module — AS-BUILT Ledger

## Module Identity

| Field | Value |
|-------|-------|
| Module Code | `audit` |
| Spec | MP-08 (`DOS-AIO-Specs/module-patch-08-audit-end-to-end.md`) |
| Layer | Core business domain module |
| Criticality | P0 — compliance and oversight critical |
| Product Owner | `shahin` |
| Route Base | `/api/audits`, `/api/audit-*` |

## Owned Artifacts

### Backend Services
- Audit core, planning, fieldwork, reporting, findings, CAPA
- Committee management, universe, risk-based planning
- Schedule monitoring, anomaly detection, trail retention
- Reminders, SLA tracking, workpaper generation
- AI reasoning audit, repeat findings detection
- Admin and diagnostics services

### Backend Routes (registered in audit-routes.catalog.ts)
- Core: audits, audit-admin, audit-diagnostics
- Advanced: audit-advanced, audit-planning, audit-reporting
- Findings: audit-findings, audit-capa, audit-capa-effectiveness
- Operations: audit-committee, audit-universe, audit-schedule
- Reporting: audit-analytics, audit-compliance

### Security
- Permissions, roles, SoD, approval matrix in `security/`
- 8 roles with DAuth lifecycle enforcement

### Events
- Subscribers registered in `agrc-event-subscribers.ts` (line 237)

### Jobs (8 registered in agrc-jobs.ts)
| Job | Cron | Purpose |
|-----|------|---------|
| `audit-findings-tracker` | `0 1 * * *` | Daily findings tracking |
| `audit-schedule-monitor` | `0 6 * * *` | Schedule monitoring |
| `audit-remediation-deadline-check` | `0 7 * * *` | Remediation deadlines |
| `audit-completion-report` | `0 2 * * 1` | Weekly completion report |
| `audit-sla-compliance` | `0 8 * * *` | SLA compliance check |
| `audit-stale-auto-archive` | `0 3 * * 0` | Weekly stale archival |
| `audit-data-retention` | `0 4 * * 0` | Weekly data retention |
| `audit-repeat-findings-detector` | `0 5 * * *` | Daily repeat detection |

### Diagnostics
- `audit-diagnostics.service.ts` with health checks

### i18n Coverage
| File | Keys | Status |
|------|------|--------|
| `i18n/en.json` | 30 | Complete |
| `i18n/ar.json` | 30 | Complete |

## Hardening Notes
- 8 audit jobs were missing from agrc-jobs.ts — all registered
- Route catalog has stale paths (points to flat structure, actual files in nested subdirs) — needs audit-routes.catalog.ts path correction in future pass
- i18n folder created with full bilingual coverage
- 5 service re-export files follow Law 1 pattern

## Known Risks
1. Route catalog paths may need updating to match nested directory structure
2. 146 files — large module, approaching sub-ownership threshold
3. Dual admin routes (in admin/ and routes/audit/core/) — consolidate to single canonical location
