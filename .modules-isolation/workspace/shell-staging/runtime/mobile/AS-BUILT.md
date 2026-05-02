# Mobile AS-BUILT

## Owned Artifacts
- **Database Tables**: `mobile_items`, `mobile_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/mobile/*`

## Protected Actions
- `mobile.create`, `mobile.read`, `mobile.update`, `mobile.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `mobile-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
