# Grc query AS-BUILT

## Owned Artifacts
- **Database Tables**: `grc_query_items`, `grc_query_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/grc-query/*`

## Protected Actions
- `grc-query.create`, `grc-query.read`, `grc-query.update`, `grc-query.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `grc-query-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
