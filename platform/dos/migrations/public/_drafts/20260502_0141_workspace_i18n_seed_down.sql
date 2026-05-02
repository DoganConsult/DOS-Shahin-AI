-- dos:draft
-- Rollback for 20260502_0141_workspace_i18n_seed.sql
-- Removes seeded rows but keeps namespaces (other modules may use them).
BEGIN;

DELETE FROM dos.i18n_translations
 WHERE source = 'platform'
   AND key_id IN (
     SELECT key_id FROM dos.i18n_keys
      WHERE ns_key IN ('workspace','status','role','shell','nav','tenant-settings','common')
   );

DELETE FROM dos.i18n_keys
 WHERE ns_key IN ('shell','nav','tenant-settings');

DELETE FROM dos.entity_status_labels
 WHERE entity_type = 'tenant';

DELETE FROM dos.role_labels
 WHERE role_code IN ('owner','tenant_owner','tenant_admin','member');

COMMIT;
