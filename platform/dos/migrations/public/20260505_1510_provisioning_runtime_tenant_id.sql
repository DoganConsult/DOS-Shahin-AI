-- =============================================================================
-- Migration: 20260505_1510_provisioning_runtime_tenant_id
-- Purpose:   W2 task line of unified signup/provisioning plan — give
--            dos_master.provisioning_job a way to record the REAL runtime
--            tenant_id (varchar(16) hex from dos.tenants) once tenant-service
--            /register has minted it. Today provisioning_job.tenant_id is a
--            uuid filled by signup-bff with gen_random_uuid() at
--            completeAttempt time; that UUID is a provisioning correlation
--            handle, not the workspace tenant.
--
--            Adds:
--              - runtime_tenant_id varchar(16) NULL — links to
--                dos.tenants.tenant_id when the runtime tenant exists
--              - ix_dms_pj_runtime_tenant_id (partial, NOT NULL)
--
--            Preserves the existing tenant_id uuid column so the historical
--            correlation handle survives. A future wave (W7) renames
--            tenant_id → provisioning_correlation_id once SPA + worker
--            consumers are migrated.
--
-- Controlled-DDL: dos_master.provisioning_job IS protected by
-- trg_dos_master_only at row level. ALTER TABLE is DDL — no row writes — so
-- this migration does NOT need dos.actor='dos-master'.
--
-- Idempotent: YES (ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS).
-- =============================================================================

BEGIN;

ALTER TABLE dos_master.provisioning_job
  ADD COLUMN IF NOT EXISTS runtime_tenant_id varchar(16);

CREATE INDEX IF NOT EXISTS ix_dms_pj_runtime_tenant_id
  ON dos_master.provisioning_job (runtime_tenant_id)
  WHERE runtime_tenant_id IS NOT NULL;

COMMENT ON COLUMN dos_master.provisioning_job.runtime_tenant_id IS
  '2026-05-05 — populated by tenant-service /register (or provisioning worker) once dos.tenants.tenant_id has been minted. NULL while the job is purely correlation-only. workspace-bootstrap invalidation MUST scope by this column when set, never by the legacy tenant_id uuid.';

COMMIT;
