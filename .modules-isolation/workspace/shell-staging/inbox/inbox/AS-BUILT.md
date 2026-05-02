# Inbox AS-BUILT

## Owned Artifacts
- **Database Tables**: `inbox_items`, `inbox_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/inbox/*`

## Protected Actions
- `inbox.create`, `inbox.read`, `inbox.update`, `inbox.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `inbox-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
