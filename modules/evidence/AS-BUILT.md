# Evidence AS-BUILT

## Owned Artifacts
- **Database Tables**: `evidence_items`, `evidence_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/evidence/*`

## Protected Actions
- `evidence.create`, `evidence.read`, `evidence.update`, `evidence.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `evidence-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
