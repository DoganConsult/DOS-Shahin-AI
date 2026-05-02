# Local knowledge AS-BUILT

## Owned Artifacts
- **Database Tables**: `local_knowledge_items`, `local_knowledge_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/local-knowledge/*`

## Protected Actions
- `local-knowledge.create`, `local-knowledge.read`, `local-knowledge.update`, `local-knowledge.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `local-knowledge-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
