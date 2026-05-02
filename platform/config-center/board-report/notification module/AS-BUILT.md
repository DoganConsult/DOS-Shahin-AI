# Notification AS-BUILT

## Owned Artifacts
- **Database Tables**: `notification_items`, `notification_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/notification/*`

## Protected Actions
- `notification.create`, `notification.read`, `notification.update`, `notification.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `notification-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
