# Incident Module — AS-BUILT Ledger

## Module Identity
| Field | Value |
|-------|-------|
| Module Code | `incident` |
| Spec | MP-13 (`DOS-AIO-Specs/module-patch-13-incident-end-to-end.md`) |
| Layer | Core business domain module |
| Criticality | P0 — operational resilience |
| Product Owner | `shahin` |

## Status
- Routes: Registered in domain-routes.catalog.ts (incidents, incident-advanced)
- Security: Complete (permissions, roles, SoD, approval matrix)
- Events: Subscribers registered in agrc-event-subscribers.ts
- Diagnostics: Implemented
- i18n: en.json (23 keys) + ar.json (23 keys)
- Jobs: incident-monitor.job.ts exists

## Hardening Notes
- i18n folder created with full bilingual coverage
- Jobs may need explicit registration in agrc-jobs.ts
