-- Down: 20260502_0140 platform-admin DNA enrollment
BEGIN;

DELETE FROM dos.dynamic_ui_navigation
 WHERE tenant_id IS NULL
   AND module_code IN (
     'dauth','config-center','tenant-management','multi-tenant-mgmt',
     'foundation-admin','dos-platform','dnoc','dsoc','ai-platform'
   );

DELETE FROM dos.dynamic_ui_modules
 WHERE module_code IN (
   'dauth','config-center','tenant-management','multi-tenant-mgmt',
   'foundation-admin','dos-platform','dnoc','dsoc','ai-platform'
 );

COMMIT;
