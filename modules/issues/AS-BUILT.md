# Issues AS-BUILT

## Owned Artifacts
- **Database Tables**: `issues_items`, `issues_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/issues/*`

## Protected Actions
- `issues.create`, `issues.read`, `issues.update`, `issues.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `issues-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
