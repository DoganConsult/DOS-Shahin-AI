# Training AS-BUILT

## Owned Artifacts
- **Database Tables**: `training_items`, `training_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/training/*`

## Protected Actions
- `training.create`, `training.read`, `training.update`, `training.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `training-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
