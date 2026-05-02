-- DSOC bootstrap rollback — drops the schema and all DSOC data.
--
-- WARNING: this is destructive. Only run during fresh-environment
-- provisioning before DSOC has accepted any production traffic.

DROP SCHEMA IF EXISTS platform_dsoc CASCADE;
