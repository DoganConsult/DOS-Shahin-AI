# Ai AS-BUILT

## Owned Artifacts
- **Database Tables**: `ai_items`, `ai_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/ai/*`

## Protected Actions
- `ai.create`, `ai.read`, `ai.update`, `ai.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `ai-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
