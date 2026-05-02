# Portals AS-BUILT

## Owned Artifacts
- **Database Tables**: `portals_items`, `portals_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/portals/*`

## Protected Actions
- `portals.create`, `portals.read`, `portals.update`, `portals.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `portals-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
