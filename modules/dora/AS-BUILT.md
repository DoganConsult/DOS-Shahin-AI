# Dora AS-BUILT

## Owned Artifacts
- **Database Tables**: `dora_items`, `dora_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/dora/*`

## Protected Actions
- `dora.create`, `dora.read`, `dora.update`, `dora.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `dora-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
