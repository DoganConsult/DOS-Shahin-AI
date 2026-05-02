-- Rollback: 009_service_domain_tables.sql
-- Drops all service domain tables in reverse FK order.

BEGIN;

-- Remove columns added to public tables
ALTER TABLE public.email_verification_tokens DROP COLUMN IF EXISTS used_at;
ALTER TABLE public.users DROP COLUMN IF EXISTS onboarding_complete;
ALTER TABLE public.users DROP COLUMN IF EXISTS email_verified;

-- Audit service
DROP TABLE IF EXISTS dos.audit_logs CASCADE;

-- Platform core
DROP TABLE IF EXISTS dos.mobile_sessions CASCADE;

-- Platform product
DROP TABLE IF EXISTS dos.product_licenses CASCADE;

-- AGRC OS
DROP TABLE IF EXISTS dos.agrc_tasks CASCADE;

-- Qiyas journey
DROP TABLE IF EXISTS dos.qiyas_journeys CASCADE;

-- Records
DROP TABLE IF EXISTS dos.records CASCADE;

-- Portals
DROP TABLE IF EXISTS dos.portals CASCADE;

-- Integrations
DROP TABLE IF EXISTS dos.integrations CASCADE;

-- Executive intelligence
DROP TABLE IF EXISTS dos.briefings CASCADE;

-- Analytics / dashboard (FK: widgets -> dashboards)
DROP TABLE IF EXISTS dos.report_schedules CASCADE;
DROP TABLE IF EXISTS dos.widgets CASCADE;
DROP TABLE IF EXISTS dos.dashboards CASCADE;

-- Evidence / audit reporting
DROP TABLE IF EXISTS dos.audit_findings CASCADE;
DROP TABLE IF EXISTS dos.evidence CASCADE;

-- Remediation
DROP TABLE IF EXISTS dos.remediation_actions CASCADE;

-- DORA
DROP TABLE IF EXISTS dos.dora_assessments CASCADE;

-- Privacy
DROP TABLE IF EXISTS dos.privacy_assessments CASCADE;

-- Training (FK: enrollments -> courses)
DROP TABLE IF EXISTS dos.training_enrollments CASCADE;
DROP TABLE IF EXISTS dos.training_courses CASCADE;

-- BCP
DROP TABLE IF EXISTS dos.bcp_plans CASCADE;

-- Asset
DROP TABLE IF EXISTS dos.assets CASCADE;

-- Vendor
DROP TABLE IF EXISTS dos.vendors CASCADE;

-- Governance / policy
DROP TABLE IF EXISTS dos.policies CASCADE;

-- Compliance (FK: controls -> frameworks)
DROP TABLE IF EXISTS dos.controls CASCADE;
DROP TABLE IF EXISTS dos.compliance_frameworks CASCADE;

-- Risk / incident
DROP TABLE IF EXISTS dos.incidents CASCADE;
DROP TABLE IF EXISTS dos.risks CASCADE;

-- Notification
DROP TABLE IF EXISTS dos.inbox_items CASCADE;
DROP TABLE IF EXISTS dos.notifications CASCADE;

-- Workflow (FK: tasks/approvals/schedules -> instances)
DROP TABLE IF EXISTS dos.workflow_sla_configs CASCADE;
DROP TABLE IF EXISTS dos.workflow_schedules CASCADE;
DROP TABLE IF EXISTS dos.workflow_approvals CASCADE;
DROP TABLE IF EXISTS dos.workflow_tasks CASCADE;
DROP TABLE IF EXISTS dos.workflow_instances CASCADE;

-- Onboarding
DROP TABLE IF EXISTS dos.onboarding_journeys CASCADE;

COMMIT;
