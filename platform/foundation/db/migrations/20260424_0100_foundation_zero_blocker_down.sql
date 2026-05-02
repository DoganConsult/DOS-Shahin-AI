-- Down migration for 20260424_0100_foundation_zero_blocker.sql
BEGIN;

DELETE FROM dos.role_permissions
 WHERE role_id IN (
   'role_platform_super_admin','role_tenant_owner','role_org_admin',
   'role_hr_admin','role_risk_manager','role_compliance_officer',
   'role_auditor','role_viewer'
 );
DELETE FROM dos.functional_roles
 WHERE role_id IN (
   'role_platform_super_admin','role_tenant_owner','role_org_admin',
   'role_hr_admin','role_risk_manager','role_compliance_officer',
   'role_auditor','role_viewer'
 );
DELETE FROM dos.permissions WHERE permission_id LIKE 'perm_%';

DROP TABLE IF EXISTS dos.audit_trail;
DROP TABLE IF EXISTS dos.invitations;
DROP TABLE IF EXISTS dos.ownership_mappings;
DROP TABLE IF EXISTS dos.committee_members;
DROP TABLE IF EXISTS dos.committees;
DROP TABLE IF EXISTS dos.location_bu_map;
DROP TABLE IF EXISTS dos.locations;
DROP TABLE IF EXISTS dos.position_assignments;
DROP TABLE IF EXISTS dos.positions;
DROP TABLE IF EXISTS dos.business_units;
DROP TABLE IF EXISTS dos.organizations;

COMMIT;
