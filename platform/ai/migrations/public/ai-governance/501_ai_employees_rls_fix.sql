-- 501_ai_employees_rls_fix.sql
-- Phase 1 audit fix: align RLS policies with the platform's canonical
-- setting name `app.current_tenant_id` (not `app.tenant_id`).
--
-- Behaviour after this migration matches modules/platform-core/db/tenant/
-- migrations/020_row_level_security.sql:
--   - If app.current_tenant_id is NOT set → all rows visible (migrations/admin path)
--   - If app.current_tenant_id IS set     → only matching tenant_id rows visible
--   - Rows with tenant_id IS NULL (platform-global, e.g. A13) are visible to everyone
--
-- The service-role bypass policies from 500_ai_employees.sql are dropped
-- because the standard "no setting = visible" semantics already cover them.

DROP POLICY IF EXISTS ai_employee_shifts_tenant_isolation        ON public.ai_employee_shifts;
DROP POLICY IF EXISTS ai_employee_reports_tenant_isolation       ON public.ai_employee_reports;
DROP POLICY IF EXISTS ai_employee_kpi_snapshots_tenant_isolation ON public.ai_employee_kpi_snapshots;
DROP POLICY IF EXISTS ai_employee_shifts_service_role            ON public.ai_employee_shifts;
DROP POLICY IF EXISTS ai_employee_reports_service_role           ON public.ai_employee_reports;
DROP POLICY IF EXISTS ai_employee_kpi_snapshots_service_role     ON public.ai_employee_kpi_snapshots;

CREATE POLICY ai_employee_shifts_tenant_isolation ON public.ai_employee_shifts
  USING (
    current_setting('app.current_tenant_id', TRUE) IS NULL
    OR current_setting('app.current_tenant_id', TRUE) = ''
    OR tenant_id IS NULL
    OR tenant_id = current_setting('app.current_tenant_id', TRUE)
  );

CREATE POLICY ai_employee_reports_tenant_isolation ON public.ai_employee_reports
  USING (
    current_setting('app.current_tenant_id', TRUE) IS NULL
    OR current_setting('app.current_tenant_id', TRUE) = ''
    OR tenant_id IS NULL
    OR tenant_id = current_setting('app.current_tenant_id', TRUE)
  );

CREATE POLICY ai_employee_kpi_snapshots_tenant_isolation ON public.ai_employee_kpi_snapshots
  USING (
    current_setting('app.current_tenant_id', TRUE) IS NULL
    OR current_setting('app.current_tenant_id', TRUE) = ''
    OR tenant_id IS NULL
    OR tenant_id = current_setting('app.current_tenant_id', TRUE)
  );

-- Add a tenant-only index that the routes' existing WHERE-by-tenant queries can use.
CREATE INDEX IF NOT EXISTS idx_ai_employee_reports_tenant_filed
  ON public.ai_employee_reports (tenant_id, filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_employee_shifts_tenant
  ON public.ai_employee_shifts (tenant_id);
