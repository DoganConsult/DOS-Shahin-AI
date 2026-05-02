# Agrc engine AS-BUILT

## Owned Artifacts
- **Database Tables**: `agrc_engine_items`, `agrc_engine_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/agrc-engine/*`

## Protected Actions
- `agrc-engine.create`, `agrc-engine.read`, `agrc-engine.update`, `agrc-engine.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `agrc-engine-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
