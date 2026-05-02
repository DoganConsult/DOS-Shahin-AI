# Action AS-BUILT

## Owned Artifacts
- **Database Tables**: `action_items`, `action_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/action/*`

## Protected Actions
- `action.create`, `action.read`, `action.update`, `action.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `action-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
