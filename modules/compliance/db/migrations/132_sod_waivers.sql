-- dos:supersedes-checksum: 40b3cd8dc7ee61879f422afc0157c9feaaf7ad64031b5fa94aa6088b5df4e5b9
-- ============================================================================
-- 132_sod_waivers.sql
-- Temporary SoD waiver ledger (per-user, per-rule, expiring).
--
-- Consumed by:
--   - services/auth-service/src/domain/sod/sod-policy.service.ts#grantSodWaiver
--
-- Waiver gating rules:
--   * rule must exist in sod_rules with temporary_waiver_allowed = TRUE
--   * duration_days <= sod_rules.waiver_max_days (when non-null)
--   * active while expires_at > NOW() AND is_active = TRUE AND revoked_at IS NULL
--
-- The decision engine consults this table AFTER evaluateSod() returns a
-- 'block' / 'escalate' outcome — a live waiver downgrades the outcome to
-- 'allow-with-audit-reason' (see sod-engine.ts §10).
-- ============================================================================

CREATE TABLE IF NOT EXISTS sod_waivers (
  waiver_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       VARCHAR(64)  NOT NULL,
  rule_code     VARCHAR(100) NOT NULL,
  granted_by    VARCHAR(128) NOT NULL,
  granted_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ  NOT NULL,
  revoked_at    TIMESTAMPTZ,
  revoked_by    VARCHAR(128),
  revoke_reason TEXT,
  reason        TEXT,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sod_waivers_active_user
  ON sod_waivers (user_id, rule_code)
  WHERE is_active = TRUE AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sod_waivers_expiry
  ON sod_waivers (expires_at)
  WHERE is_active = TRUE AND revoked_at IS NULL;
