-- Down for 20260422_0002_keycloak_bootstrap_align.sql.
-- Best-effort reversal. Leaves the widened tenant_id type and the new
-- tenants_status_check in place because narrowing back would risk data
-- loss after the migration has been used in production.

ALTER TABLE public.tenant_user_memberships DROP COLUMN IF EXISTS is_tenant_owner;
ALTER TABLE public.tenant_user_memberships DROP COLUMN IF EXISTS membership_type;

ALTER TABLE public.users DROP COLUMN IF EXISTS platform_role;
ALTER TABLE public.users DROP COLUMN IF EXISTS locked_until;
ALTER TABLE public.users DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE public.users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE public.users DROP COLUMN IF EXISTS must_change_password;
ALTER TABLE public.users DROP COLUMN IF EXISTS member_onboarded;
ALTER TABLE public.users DROP COLUMN IF EXISTS onboarding_complete;
ALTER TABLE public.users DROP COLUMN IF EXISTS full_name;
ALTER TABLE public.users DROP COLUMN IF EXISTS name;
ALTER TABLE public.users DROP COLUMN IF EXISTS role;
ALTER TABLE public.users DROP COLUMN IF EXISTS tenant_id;
DROP INDEX IF EXISTS public.users_tenant_id_idx;
