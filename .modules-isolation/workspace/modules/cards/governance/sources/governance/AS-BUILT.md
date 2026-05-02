# Governance AS-BUILT

## Owned Artifacts
- **Database Tables**: `governance_items`, `governance_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/governance/*`

## Protected Actions
- `governance.create`, `governance.read`, `governance.update`, `governance.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `governance-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
