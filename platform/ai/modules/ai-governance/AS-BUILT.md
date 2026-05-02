# Ai governance AS-BUILT

## Owned Artifacts
- **Database Tables**: `ai_governance_items`, `ai_governance_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/ai-governance/*`

## Protected Actions
- `ai-governance.create`, `ai-governance.read`, `ai-governance.update`, `ai-governance.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `ai-governance-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
