# Audit AS-BUILT

## Owned Artifacts
- **Database Tables**: `audit_items`, `audit_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/audit/*`

## Protected Actions
- `audit.create`, `audit.read`, `audit.update`, `audit.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `audit-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
