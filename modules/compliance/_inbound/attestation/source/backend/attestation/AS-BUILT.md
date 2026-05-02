# AS-BUILT: Attestation Module (MP-51)

## Module Identity
- **Module Code:** `attestation`
- **Tier:** Cross-Module Support Surface
- **Criticality:** P2

## Owned Artifacts
- **Database Tables:** `attestation_campaigns`, `attestation_records`, `attestation_evidence_links`
- **Aggregate Root:** `attestation_campaigns`
- **API Surface:** `/api/attestation/` → `/campaigns`, `/records`, `/records/:id/review`, `/diagnostics`

## Protected Actions (DAuth Enforcement Points)
- `attestation.campaign.manage` — Create/transition campaigns (DAuth lifecycle gated)
- `attestation.record.manage` — Submit attestation records
- `attestation.record.review` — Review submissions (**SoD enforced: reviewer ≠ attestor**)

## SoD Rules
- `attestation.sod.attestor_reviewer`: The user who submitted an attestation record CANNOT review that same record. Enforced at service layer via `reviewRecord()`.

## Diagnostics
- Total/active/overdue campaigns
- Pending records count
- Health status (degraded if overdue campaigns exist)

## Event Backbone
- Publishes: `attestation.campaign_created`, `attestation.record_reviewed`
- Consumes: `compliance.control_updated`
