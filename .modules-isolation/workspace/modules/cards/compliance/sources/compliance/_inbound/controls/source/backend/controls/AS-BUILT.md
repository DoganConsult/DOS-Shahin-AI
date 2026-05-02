# Controls Module — AS-BUILT Ledger

## Module Identity
| Field | Value |
|-------|-------|
| Module Code | `controls` |
| Spec | MP-14 (`DOS-AIO-Specs/module-patch-14-controls-end-to-end.md`) |
| Layer | Core business domain module |
| Criticality | P0 — control framework |
| Product Owner | `shahin` |

## Status
- Routes: Registered in compliance-routes.catalog.ts (shared)
- Security: Complete (permissions, roles, SoD, approval matrix)
- Events: Subscribers NOT registered — needs registration
- Diagnostics: Implemented
- i18n: en.json (22 keys) + ar.json (22 keys)
- Jobs: ccm-worker registered in agrc-jobs.ts

## Hardening Notes
- i18n folder created with full bilingual coverage
- No dedicated controls-routes.catalog.ts — routes shared with compliance
- Event subscribers need registration in agrc-event-subscribers.ts
