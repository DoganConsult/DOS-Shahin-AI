# Ksa regulatory AS-BUILT

## Owned Artifacts
- **Database Tables**: `ksa_regulatory_items`, `ksa_regulatory_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/ksa-regulatory/*`

## Protected Actions
- `ksa-regulatory.create`, `ksa-regulatory.read`, `ksa-regulatory.update`, `ksa-regulatory.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `ksa-regulatory-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
