# Asset AS-BUILT

## Owned Artifacts
- **Database Tables**: `asset_items`, `asset_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/asset/*`

## Protected Actions
- `asset.create`, `asset.read`, `asset.update`, `asset.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `asset-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
