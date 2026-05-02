# Privacy AS-BUILT

## Owned Artifacts
- **Database Tables**: `privacy_items`, `privacy_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/privacy/*`

## Protected Actions
- `privacy.create`, `privacy.read`, `privacy.update`, `privacy.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `privacy-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
