-- =====================================================================
-- Tenant schema bootstrap: approval_requests (20260425_0008)
--
-- workflow-service's /api/approval-requests handlers SELECT / UPDATE
-- "{tenant_schema}".approval_requests. Per the platform's
-- schema-per-tenant model (memory: "DB Architecture 2026-04-20"),
-- tenant-scoped domain tables live in `tenant_<uuid_hex>` schemas, not
-- in dos.*.
--
-- The table was never provisioned on existing tenant schemas, so every
-- /api/approval-requests/* request hangs inside safeQuery waiting on a
-- query that never completes (handler never returns).
--
-- Fix: iterate every tenant schema (public.tenants.schema_name) and
-- CREATE TABLE IF NOT EXISTS approval_requests with the shape the
-- handlers read/write. Idempotent.
--
-- Columns chosen to match the service's SELECT / UPDATE statements in
-- modules/workflow/source/backend/workflow/services/approvals/
-- approval-routing.service.ts and the dashboard aggregate in
-- modules/workflow/source/backend/workflow/routes/misc/
-- approval-requests.routes.ts.
-- =====================================================================

BEGIN;

SET search_path = public;

DO $bootstrap$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT schema_name
             FROM public.tenants
            WHERE schema_name IS NOT NULL
              AND schema_name LIKE 'tenant\_%' ESCAPE '\'
  LOOP
    EXECUTE format($ddl$
      CREATE TABLE IF NOT EXISTS %I.approval_requests (
        request_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id        VARCHAR(64) NOT NULL,
        module           TEXT,
        entity_type      TEXT,
        entity_id        VARCHAR(64),
        title            TEXT        NOT NULL,
        description      TEXT,
        status           TEXT        NOT NULL DEFAULT 'pending',
        priority         TEXT,
        requested_by     VARCHAR(64),
        assigned_to      VARCHAR(64),
        approver_role    VARCHAR(100),
        sla_deadline     TIMESTAMPTZ,
        approved_by      VARCHAR(64),
        approved_at      TIMESTAMPTZ,
        rejected_reason  TEXT,
        comment          TEXT,
        payload          JSONB,
        escalated_at     TIMESTAMPTZ,
        reassigned_to    VARCHAR(64),
        reassigned_at    TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at       TIMESTAMPTZ
      )
    $ddl$, r.schema_name);

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_approval_requests_status ON %I.approval_requests(status) WHERE deleted_at IS NULL',
      r.schema_name, r.schema_name
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_approval_requests_assigned_to ON %I.approval_requests(assigned_to) WHERE deleted_at IS NULL',
      r.schema_name, r.schema_name
    );
  END LOOP;
END $bootstrap$;

COMMIT;
