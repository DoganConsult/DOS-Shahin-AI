BEGIN;
-- Rollback for auth tables migration
-- This file safely removes the authentication tables and related objects

-- Drop indexes first (they depend on tables)
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_tenant_id;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP INDEX IF EXISTS idx_sessions_token_hash;
DROP INDEX IF EXISTS idx_sessions_expires_at;
DROP INDEX IF EXISTS idx_refresh_tokens_user_id;
DROP INDEX IF EXISTS idx_refresh_tokens_token_hash;
DROP INDEX IF EXISTS idx_refresh_tokens_expires_at;
DROP INDEX IF EXISTS idx_mfa_secrets_user_id;
DROP INDEX IF EXISTS idx_mfa_secrets_type;
DROP INDEX IF EXISTS idx_failed_login_attempts_email;
DROP INDEX IF EXISTS idx_failed_login_attempts_ip_address;
DROP INDEX IF EXISTS idx_failed_login_attempts_created_at;

-- Drop foreign key constraints
ALTER TABLE dos.sessions DROP CONSTRAINT IF EXISTS fk_sessions_user_id;
ALTER TABLE dos.refresh_tokens DROP CONSTRAINT IF EXISTS fk_refresh_tokens_user_id;
ALTER TABLE dos.mfa_secrets DROP CONSTRAINT IF EXISTS fk_mfa_secrets_user_id;
ALTER TABLE dos.failed_login_attempts DROP CONSTRAINT IF EXISTS fk_failed_login_attempts_user_id;

-- Drop tables in reverse order of creation
DROP TABLE IF EXISTS dos.failed_login_attempts;
DROP TABLE IF EXISTS dos.mfa_secrets;
DROP TABLE IF EXISTS dos.refresh_tokens;
DROP TABLE IF EXISTS dos.sessions;
DROP TABLE IF EXISTS dos.users;

-- Drop sequences if they exist
DROP SEQUENCE IF EXISTS dos.users_id_seq;
DROP SEQUENCE IF EXISTS dos.sessions_id_seq;
DROP SEQUENCE IF EXISTS dos.refresh_tokens_id_seq;
DROP SEQUENCE IF EXISTS dos.mfa_secrets_id_seq;
DROP SEQUENCE IF EXISTS dos.failed_login_attempts_id_seq;

-- Drop custom types if they exist
DROP TYPE IF EXISTS dos.user_role;
DROP TYPE IF EXISTS dos.session_status;
DROP TYPE IF EXISTS dos.mfa_type;

-- Note: This rollback assumes no data loss is acceptable
-- In production, consider backing up data before rollback

COMMIT;
