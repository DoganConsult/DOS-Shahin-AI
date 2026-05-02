-- DAuth — drop the `platform_dauth` schema + all views.
--
-- Safe rollback: the schema only contains views over existing tables,
-- so dropping it does not remove any data. Any caller that had started
-- reading through `platform_dauth.*` must fall back to the legacy
-- `dos.*` / `public.*` paths before this rollback runs.

DROP SCHEMA IF EXISTS platform_dauth CASCADE;
