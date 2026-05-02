# Reporting AS-BUILT

## Owned Artifacts
- **Database Tables**: `reporting_items`, `reporting_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/reporting/*`

## Protected Actions
- `reporting.create`, `reporting.read`, `reporting.update`, `reporting.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `reporting-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
