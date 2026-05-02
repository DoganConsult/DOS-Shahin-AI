# Remediation AS-BUILT

## Owned Artifacts
- **Database Tables**: `remediation_items`, `remediation_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/remediation/*`

## Protected Actions
- `remediation.create`, `remediation.read`, `remediation.update`, `remediation.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `remediation-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
