-- 20260505_0710_dos_master_session_policy.sql
-- DOS Master L37 (Phase 4) — customer-zone session TTL contract.
--
-- Owner: dos-master writer.
-- Doctrine binding: §15 (customer-zone hardening) + Article 11.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.platform_session_policy (
  trust_zone               text PRIMARY KEY CHECK (trust_zone IN ('admin','tenant','customer')),
  access_token_ttl_seconds integer NOT NULL CHECK (access_token_ttl_seconds > 0),
  refresh_token_ttl_seconds integer NOT NULL CHECK (refresh_token_ttl_seconds > 0),
  pkce_required            boolean NOT NULL DEFAULT false,
  cookie_secure            boolean NOT NULL DEFAULT true,
  cookie_samesite          text    NOT NULL DEFAULT 'Lax' CHECK (cookie_samesite IN ('Strict','Lax','None')),
  rate_limit_per_minute    integer NOT NULL DEFAULT 600 CHECK (rate_limit_per_minute > 0),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  written_by               text NOT NULL DEFAULT current_setting('dos.actor', true)
);

CREATE OR REPLACE FUNCTION dos.trg_dos_master_only_session_policy() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('dos.actor', true), '') <> 'dos-master' THEN
    RAISE EXCEPTION 'dos.platform_session_policy write rejected: actor=%', current_setting('dos.actor', true);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dos_master_only_session_policy ON dos.platform_session_policy;
CREATE TRIGGER trg_dos_master_only_session_policy
  BEFORE INSERT OR UPDATE OR DELETE ON dos.platform_session_policy
  FOR EACH ROW EXECUTE FUNCTION dos.trg_dos_master_only_session_policy();

SET LOCAL dos.actor = 'dos-master';
INSERT INTO dos.platform_session_policy
  (trust_zone, access_token_ttl_seconds, refresh_token_ttl_seconds, pkce_required, cookie_secure, cookie_samesite, rate_limit_per_minute)
VALUES
  ('admin',    900,   3600,   true,  true, 'Strict', 300),
  ('tenant',   1800,  28800,  true,  true, 'Lax',    1200),
  ('customer', 1800,  28800,  true,  true, 'Lax',    600)
ON CONFLICT (trust_zone) DO NOTHING;

COMMIT;
