-- Rollback: 004_dos_dauth_platform_layer.sql
-- Drops tables unique to this migration (tables duplicated from 003 are left alone).

BEGIN;

-- DAuth sessions & auth
DROP TABLE IF EXISTS dos.sessions CASCADE;
DROP TABLE IF EXISTS dos.user_mfa CASCADE;
DROP TABLE IF EXISTS dos.login_attempts CASCADE;

-- DAuth template tables
DROP TABLE IF EXISTS dos.sod_conflict_audit_template CASCADE;
DROP TABLE IF EXISTS dos.lifecycle_auth_log_template CASCADE;
DROP TABLE IF EXISTS dos.sign_off_authorities_template CASCADE;
DROP TABLE IF EXISTS dos.approval_matrix_rules_template CASCADE;

-- Platform audit
DROP TABLE IF EXISTS dos.platform_audit_logs CASCADE;

-- Config registry (FK-dependent order: values/locks/audit before definitions)
DROP TABLE IF EXISTS dos.config_audit_logs CASCADE;
DROP TABLE IF EXISTS dos.config_locks CASCADE;
DROP TABLE IF EXISTS dos.config_values CASCADE;
DROP TABLE IF EXISTS dos.config_definitions CASCADE;

-- Runtime config
DROP TABLE IF EXISTS dos.config_runtime_overrides CASCADE;
DROP TABLE IF EXISTS dos.runtime_config_history CASCADE;
DROP TABLE IF EXISTS dos.runtime_config CASCADE;

-- NOTE: The following tables are duplicates from 003 and are NOT dropped here:
--   dos.platform_operation_config, dos.system_events, dos.product_registry,
--   dos.module_registry, dos.feature_flags, dos.tenant_product_activation,
--   dos.ai_model_registry, dos.ai_agent_registry, dos.ai_prompt_registry

COMMIT;
