# Widgets AS-BUILT

## Owned Artifacts
- **Database Tables**: `widgets_items`, `widgets_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/widgets/*`

## Protected Actions
- `widgets.create`, `widgets.read`, `widgets.update`, `widgets.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `widgets-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
