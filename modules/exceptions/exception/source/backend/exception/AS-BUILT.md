# Exception Module — AS-BUILT Ledger

## Module Identity
| Field | Value |
|-------|-------|
| Module Code | `exception` |
| Spec | MP-15 (`DOS-AIO-Specs/module-patch-15-exception-end-to-end.md`) |
| Layer | Core business domain module |
| Criticality | P1 — policy exception management |
| Product Owner | `shahin` |

## Status
- Routes: Registered (need verification of catalog completeness)
- Security: Complete (permissions, roles, SoD, approval matrix)
- Events: Subscribers registered in agrc-event-subscribers.ts
- Diagnostics: Implemented
- i18n: en.json (21 keys) + ar.json (21 keys)

## Hardening Notes
- i18n folder created with full bilingual coverage
- No dedicated exception-routes.catalog.ts — verify routes in domain catalog
