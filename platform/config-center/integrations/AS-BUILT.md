# Integrations AS-BUILT

## Owned Artifacts
- **Database Tables**: `integrations_items`, `integrations_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/integrations/*`

## Protected Actions
- `integrations.create`, `integrations.read`, `integrations.update`, `integrations.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `integrations-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
