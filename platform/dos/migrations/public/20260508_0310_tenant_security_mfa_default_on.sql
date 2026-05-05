-- 20260508_0310 — turn MFA on by default for every active tenant.
--
-- Phase WS-Auth: the /auth/mfa Carbon page + auth-service /api/auth/mfa
-- routes were shipped but `dos.tenant_security_policy` had zero rows, so
-- `oidc/callback` (and now `/api/auth/password/login`) never branched
-- into the MFA flow. Seed one row per active tenant with mfa_required=true
-- so the OTP page is reached after every login.

BEGIN;

INSERT INTO dos.tenant_security_policy
  (tenant_id, mfa_required, mfa_channel, mfa_otp_ttl_sec, updated_at, updated_by)
SELECT t.tenant_id, true, 'email', 300, now(), 'mfa-default-on-2026-05-08'
  FROM dos.tenants t
 WHERE t.status = 'active'
ON CONFLICT (tenant_id) DO UPDATE
   SET mfa_required = EXCLUDED.mfa_required,
       updated_at   = now(),
       updated_by   = EXCLUDED.updated_by;

DO $$
DECLARE missing INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing
    FROM dos.tenants t
    LEFT JOIN dos.tenant_security_policy p ON p.tenant_id = t.tenant_id
   WHERE t.status = 'active'
     AND (p.tenant_id IS NULL OR p.mfa_required IS DISTINCT FROM true);
  IF missing > 0 THEN
    RAISE EXCEPTION 'mfa_required not on for % active tenant(s)', missing;
  END IF;
END $$;

COMMIT;
