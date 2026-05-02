# Controls AS-BUILT

## Owned Artifacts
- **Database Tables**: `controls_items`, `controls_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/controls/*`

## Protected Actions
- `controls.create`, `controls.read`, `controls.update`, `controls.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `controls-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
