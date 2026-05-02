# Benchmarks AS-BUILT

## Owned Artifacts
- **Database Tables**: `benchmarks_items`, `benchmarks_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/benchmarks/*`

## Protected Actions
- `benchmarks.create`, `benchmarks.read`, `benchmarks.update`, `benchmarks.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `benchmarks-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
