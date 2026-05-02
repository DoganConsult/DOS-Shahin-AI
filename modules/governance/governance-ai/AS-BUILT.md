# Governance ai AS-BUILT

## Owned Artifacts
- **Database Tables**: `governance_ai_items`, `governance_ai_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/governance-ai/*`

## Protected Actions
- `governance-ai.create`, `governance-ai.read`, `governance-ai.update`, `governance-ai.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `governance-ai-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
