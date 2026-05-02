# Policy AS-BUILT

## Owned Artifacts
- **Database Tables**: `policy_items`, `policy_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/policy/*`

## Protected Actions
- `policy.create`, `policy.read`, `policy.update`, `policy.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `policy-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
