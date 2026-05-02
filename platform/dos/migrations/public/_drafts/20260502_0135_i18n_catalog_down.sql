-- dos:draft
-- Rollback for 20260502_0135_i18n_catalog.sql
BEGIN;
DROP TABLE IF EXISTS dos.i18n_translations CASCADE;
DROP TABLE IF EXISTS dos.i18n_keys CASCADE;
DROP TABLE IF EXISTS dos.i18n_namespaces CASCADE;
COMMIT;
