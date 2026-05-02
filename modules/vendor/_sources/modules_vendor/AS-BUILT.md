# Vendor AS-BUILT

## Owned Artifacts
- **Database Tables**: `vendor_items`, `vendor_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/vendor/*`

## Protected Actions
- `vendor.create`, `vendor.read`, `vendor.update`, `vendor.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `vendor-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
