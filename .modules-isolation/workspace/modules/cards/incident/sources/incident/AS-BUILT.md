# Incident AS-BUILT

## Owned Artifacts
- **Database Tables**: `incident_items`, `incident_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/incident/*`

## Protected Actions
- `incident.create`, `incident.read`, `incident.update`, `incident.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `incident-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
