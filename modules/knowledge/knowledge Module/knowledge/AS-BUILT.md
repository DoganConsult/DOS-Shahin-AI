# Knowledge AS-BUILT

## Owned Artifacts
- **Database Tables**: `knowledge_items`, `knowledge_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/knowledge/*`

## Protected Actions
- `knowledge.create`, `knowledge.read`, `knowledge.update`, `knowledge.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `knowledge-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
