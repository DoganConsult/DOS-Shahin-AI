# Packs AS-BUILT

## Owned Artifacts
- **Database Tables**: `packs_items`, `packs_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/packs/*`

## Protected Actions
- `packs.create`, `packs.read`, `packs.update`, `packs.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `packs-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
