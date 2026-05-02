# Workflow AS-BUILT

## Owned Artifacts
- **Database Tables**: `workflow_items`, `workflow_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/workflow/*`

## Protected Actions
- `workflow.create`, `workflow.read`, `workflow.update`, `workflow.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `workflow-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
