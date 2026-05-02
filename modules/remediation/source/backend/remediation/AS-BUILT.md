# Remediation Module — AS-BUILT Ledger

## Module Identity
| Field | Value |
|-------|-------|
| Module Code | `remediation` |
| Spec | MP-16 (`DOS-AIO-Specs/module-patch-16-remediation-end-to-end.md`) |
| Layer | Core business domain module |
| Criticality | P0 — corrective action tracking |
| Product Owner | `shahin` |

## Status
- Routes: Registered in domain-routes.catalog.ts
- Security: Complete (permissions, roles, SoD, approval matrix)
- Events: Subscribers registered in agrc-event-subscribers.ts
- Diagnostics: Implemented
- i18n: en.json (21 keys) + ar.json (21 keys)

## Hardening Notes
- i18n folder created with full bilingual coverage
