# Playbooks AS-BUILT

## Owned Artifacts
- **Database Tables**: `playbooks_items`, `playbooks_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/playbooks/*`

## Protected Actions
- `playbooks.create`, `playbooks.read`, `playbooks.update`, `playbooks.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `playbooks-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
