# Module Patch MP-51 — Attestation Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 51 — Attestation Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Attestation module** end to end. 

It tells an agent exactly how to:
- inspect attestation campaign management, attestation record lifecycle, and cross-module attestation linking
- compare the current implementation against the canonical attestation target
- know exactly what files, services, contracts, tables, events, and workflows must exist
- ensure DAuth Separation of Duties (SoD) is enforced for all attestations

### 0.4 Module identity
- Module code: `attestation`
- Layer: cross-module support surface
- Criticality: **P2 medium**
- Runtime role: attestation campaign orchestration, individual attestation record management, cross-module attestation correlation (evidence, compliance, policy, vendor)
- Primary dependency domains: DOS foundation, DAuth control spine, workflow, compliance, policy

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0 (Common Enforcement Standard)
- Patch 1 (Platform Full-Stack Core)
- Patch 3 (DAuth Access)
- Patch 4 (Workflow Rules)
- Patch 5 (Lifecycle Auth)
- Patch 7 (Evidence Management)
- Patch 9 (UI/UX Standards)
- Patch 11 (Observability)

---

## 2. Module Purpose and Boundaries

### 2.1 What Attestation owns directly
- Attestation campaigns (bulk creation, schedule management, campaign lifecycle)
- Individual attestation record lifecycle (pending → submitted → approved | rejected | expired)
- Cross-module attestation entity linking (tying attestations to compliance frameworks, internal policies, vendor evaluations)
- Attestation evidence ingestion tracking
- Audit trails for attestation completion

### 2.2 What Attestation consumes from DOS
- Foundation org structure (targeting attestations to specific departments or roles)
- Event backbone (triggering campaign start, overdue reminders)

### 2.3 What Attestation consumes from DAuth
- Scoped access (who can view vs who must sign)
- Review/approval authority
- Delegation controls (an executive delegating sign-off)
- **Strict Separation of Duties (SoD)**: The attestor cannot be the reviewer accepting the attestation.

### 2.4 What Attestation consumes from adjacent modules
- **Compliance**: For framework-driven attestation triggers
- **Policy**: For employee policy acknowledgement campaigns
- **Vendor**: For vendor security compliance attestations
- **Workflow**: For orchestration of the approval state engine

### 2.5 What Attestation must not implement
- Duplicate workflow engines (campaign orchestration relies on core Workflow module)
- Duplicate generic policy documents (consumed from Policy module)

---

## 3. Canonical Backend Structure

```text
backend/src/modules/attestation/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  diagnostics/
  security/
  ports/
  index.ts
  attestation.module.ts
  lifecycle-registration.ts
```

### 3.1 Required backend service families
- **Campaign Service**: Orchestrating bulk issuance
- **Attestation Record Service**: Handling individual employee/vendor responses
- **Cross-Link Service**: Correlating records to DOS entities
- **Evidence Collection Service**: Storing signed documents/receipts
- **Reporting Service**: Aggregating completion rates
- **Diagnostics Service**: Monitoring stale/stuck records

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/attestation/
  pages/
  components/
  services/
  contracts/
  store/
  index.ts
```

Required surfaces:
- Campaign Hub (list of active/historical campaigns)
- Attestation Detail View (user's pending signature items)
- Submission Form (electronic signature, checkbox confirm, evidence upload hook)
- Review Queue (for managers/compliance officers to accept attestations)
- Reporting Dashboard (completion metrics)

---

## 5. Data Model Requirements

Attestation owns the following PostgreSQL tables:
- `attestation_campaigns` — id, name, description, start_date, due_date, status, owner_id
- `attestation_records` — id, campaign_id, attestor_user_id, status, submitted_at, reviewed_by, review_notes
- `attestation_evidence_links` — id, attestation_record_id, evidence_id (points to Evidence module)
- `attestation_entity_links` — id, campaign_id, target_entity_type, target_entity_id (e.g. policy_id)

---

## 6. API Surface Requirements

Required route groups:
- **Campaign CRUD**: `/api/attestation/campaigns`
- **Record Submission & Review**: `/api/attestation/records`
- **Evidence Linking**: `/api/attestation/records/:id/evidence`
- **Entity Linking**: `/api/attestation/campaigns/:id/links`
- **Reporting**: `/api/attestation/reporting`

Required Contracts:
- `AttestationCampaignContract`
- `AttestationRecordContract`
- `AttestationDiagnosticsContract`

Validation powered by strict Zod schema checking for all status transitions.

---

## 7. Workflow and DAuth Integration

- **Workflow**: Campaigns follow state transition (draft → active → closed). Records follow (pending → submitted → approved/rejected). 
- **DAuth**: Crucial SoD enforcement. Endpoint `/api/attestation/records/:id/review` MUST prevent `req.user.id` from equaling the record's `attestor_user_id`.

---

## 8. AI Integration

Allowed AI participation:
- Generating "readability" summaries of what is being attested to.
- Automated reminders prioritizing high-risk overdue instances.

Restricted:
- NO automated signing.
- NO silent approvals bypassing human review of exceptions.

---

## 9. UI and Experience Requirements

The UI must provide:
- Clear, legally binding visual design for the attestation form (must feel significant and intentional)
- A streamlined bulk-review queue for compliance officers
- Explicit overdue highlighting on user dashboards


### 9.1 Cross-Module UX and Interactivity
- **Frictionless Evidence Linking**: The electronic signature pane inherently mounts the DOS Evidence module's upload component.
- **Unified Inbox Aggregation**: Attestation requests bubble up symmetrically into the global Inbox rather than requiring a segregated trip to the module.

---

## 10. Settings/Admin/Runtime Control

Required controls:
- Campaign template management
- Automated reminder cadence (e.g., 3 days, 1 day, 0 days before due)
- Evidence requirement policies per campaign

---

## 11. Observability and Operations

Required diagnostics:
- Overdue attestations count
- Expired campaigns that have pending open records
- Incomplete submissions (submitted but failing evidence requirements)
- Unreviewed records bottleneck (submitted but sitting in queue > 7 days)

---

## 12. Required Tests

- Campaign state lifecycle tests
- Record submission sequence tests
- SoD enforcement test (MUST fail if attestor tries to approve own record)
- Linking referential integrity tests

---

## 13. Exact Build Instructions

If Attestation does not securely orchestrate campaigns:
- Build the `attestation_campaigns` and `attestation_records` schemas.
- Implement the Workflow step hooks so transitions track cleanly across the global board.

---

## 14. Acceptance Criteria

Pass only if:
- Campaigns can be deployed to N users securely.
- Records successfully store electronic confirmation metadata.
- SoD correctly blocks self-approval.
- Cross-entity linkage connects seamlessly to the Policy or Vendor item.

---

## 15. Fail Conditions

FAIL if:
- Attestation bypasses DAuth / Workflow logic completely.
- Form submissions store directly into memory arrays or bypass Zod validation.
- An individual can clear their own missing attestation task via API spoofing.

---

## 16. Recommended Next Part

After this module patch, the next recommended module patch is:
**Module Patch 52 — Dashboard Editor Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the attestation engine against enterprise standard, verify strict SoD, classify all gaps, implement the PG schemas, and log in the ledger.
