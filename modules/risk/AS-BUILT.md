# Risk AS-BUILT

## Owned Artifacts
- **Database Tables**: `risk_items`, `risk_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/risk/*`

## Protected Actions
- `risk.create`, `risk.read`, `risk.update`, `risk.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `risk-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
