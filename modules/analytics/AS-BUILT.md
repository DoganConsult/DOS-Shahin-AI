# Analytics AS-BUILT

## Owned Artifacts
- **Database Tables**: `analytics_items`, `analytics_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/analytics/*`

## Protected Actions
- `analytics.create`, `analytics.read`, `analytics.update`, `analytics.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `analytics-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
