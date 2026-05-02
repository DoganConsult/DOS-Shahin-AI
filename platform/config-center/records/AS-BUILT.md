# Records AS-BUILT

## Owned Artifacts
- **Database Tables**: `records_items`, `records_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/records/*`

## Protected Actions
- `records.create`, `records.read`, `records.update`, `records.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `records-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
