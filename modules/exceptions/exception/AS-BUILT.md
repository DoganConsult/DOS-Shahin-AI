# Exception AS-BUILT

## Owned Artifacts
- **Database Tables**: `exception_items`, `exception_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/exception/*`

## Protected Actions
- `exception.create`, `exception.read`, `exception.update`, `exception.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `exception-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
