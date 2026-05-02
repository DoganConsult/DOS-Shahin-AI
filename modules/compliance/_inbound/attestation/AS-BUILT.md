# Attestation AS-BUILT

## Owned Artifacts
- **Database Tables**: `attestation_items`, `attestation_logs`
- **Frontend Pages**: TBD
- **APIs**: `/api/attestation/*`

## Protected Actions
- `attestation.create`, `attestation.read`, `attestation.update`, `attestation.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `attestation-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD
