# Training Module — AS-BUILT Ledger

## Module Identity
| Field | Value |
|-------|-------|
| Module Code | `training` |
| Spec | MP-43 (`DOS-AIO-Specs/module-patch-43-training-end-to-end.md`) |
| Layer | Core business domain module |
| Criticality | P1 — compliance training and awareness |
| Product Owner | `shahin` |

## Status
- Security: Complete (permissions, roles, SoD, approval matrix)
- Events: Subscribers registered
- Diagnostics: Implemented
- i18n: en.json (25 keys) + ar.json (25 keys) — bilingual coverage
- Jobs: training-overdue-check + training-expiring-certs registered in agrc-jobs.ts

## Hardening Notes
- i18n folder created with full EN+AR bilingual coverage
- AS-BUILT.md created per Phase 6 Rule 6.4
