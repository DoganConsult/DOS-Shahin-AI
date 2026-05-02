# Proactive leadership AS-BUILT

## Owned Artifacts
- **Database Tables**: `proactive_leadership_items`, `proactive_leadership_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/proactive-leadership/*`

## Protected Actions
- `proactive-leadership.create`, `proactive-leadership.read`, `proactive-leadership.update`, `proactive-leadership.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `proactive-leadership-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
