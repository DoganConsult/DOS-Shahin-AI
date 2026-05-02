# Bcp AS-BUILT

## Owned Artifacts
- **Database Tables**: `bcp_items`, `bcp_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/bcp/*`

## Protected Actions
- `bcp.create`, `bcp.read`, `bcp.update`, `bcp.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `bcp-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
