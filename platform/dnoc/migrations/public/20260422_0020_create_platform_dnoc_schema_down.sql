-- DNOC bootstrap rollback.
-- Destructive — drops all DNOC observability data. Fresh-env only.

DROP SCHEMA IF EXISTS platform_dnoc CASCADE;
