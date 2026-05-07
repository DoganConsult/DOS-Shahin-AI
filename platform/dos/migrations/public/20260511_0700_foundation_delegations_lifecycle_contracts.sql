-- 20260511_0700_foundation_delegations_lifecycle_contracts.sql
--
-- Wave 05: Delegations lifecycle contracts (DB-first).
-- Extends dos.ui_route_delegation_rule with risk/escalation/expiry metadata
-- and seeds canonical rows for /foundation/delegations.
--
-- Idempotent, additive, no destructive operations.

BEGIN;

ALTER TABLE dos.ui_route_delegation_rule
  ADD COLUMN IF NOT EXISTS risk_level TEXT,
  ADD COLUMN IF NOT EXISTS risk_score INTEGER,
  ADD COLUMN IF NOT EXISTS escalation_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_target TEXT,
  ADD COLUMN IF NOT EXISTS escalation_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_ui_route_delegation_rule_risk_level'
      AND conrelid = 'dos.ui_route_delegation_rule'::regclass
  ) THEN
    ALTER TABLE dos.ui_route_delegation_rule
      ADD CONSTRAINT chk_ui_route_delegation_rule_risk_level
      CHECK (risk_level IS NULL OR risk_level IN ('low', 'medium', 'high', 'critical'));
  END IF;
END $$;

WITH base(route, sort_order, rule_id, delegator, delegate, scope, permission, starts_at, ends_at, status, risk_level, risk_score, escalation_required, escalation_target, escalation_due_at, escalation_reason) AS (
  VALUES
    ('/foundation/delegations', 0, 'fd-1', 'ceo@grc', 'coo@grc', 'foundation.signoff', 'foundation.attest', '2026-04-01T00:00:00Z'::timestamptz, '2026-04-15T23:59:59Z'::timestamptz, 'expired',   'high',     86, true,  'board-governance@grc', '2026-04-16T12:00:00Z'::timestamptz, 'Expired signoff delegation requires executive renewal.'),
    ('/foundation/delegations', 1, 'fd-2', 'cfo@grc', 'fin-vp@grc', 'finance.budget.approve', 'budget.approve', '2026-05-01T00:00:00Z'::timestamptz, '2026-05-31T23:59:59Z'::timestamptz, 'active',    'medium',   62, false, NULL, NULL, NULL),
    ('/foundation/delegations', 2, 'fd-3', 'ciso@grc', 'sec-mgr@grc', 'security.policy.publish', 'policy.publish', '2026-05-15T00:00:00Z'::timestamptz, NULL,                              'active',    'critical', 94, true,  'security-ops@grc',     '2026-05-20T12:00:00Z'::timestamptz, 'Open-ended security delegation requires immediate bounded expiry.'),
    ('/foundation/delegations', 3, 'fd-4', 'compliance-lead@grc', 'audit-lead@grc', 'compliance.attest', 'compliance.attest', '2026-06-01T00:00:00Z'::timestamptz, '2026-06-30T23:59:59Z'::timestamptz, 'scheduled', 'low',      24, false, NULL, NULL, NULL),
    ('/foundation/delegations', 4, 'fd-5', 'cto@grc', 'eng-mgr@grc', 'change.production.approve', 'change.approve', '2026-04-20T00:00:00Z'::timestamptz, NULL,                             'active',    'high',     79, true,  'change-advisory@grc',  '2026-05-25T12:00:00Z'::timestamptz, 'Production approval delegation missing terminal expiry.')
)
INSERT INTO dos.ui_route_delegation_rule (
  route, sort_order, rule_id, delegator, delegate, scope, permission, starts_at, ends_at, status,
  risk_level, risk_score, escalation_required, escalation_target, escalation_due_at, escalation_reason
)
SELECT
  route, sort_order, rule_id, delegator, delegate, scope, permission, starts_at, ends_at, status,
  risk_level, risk_score, escalation_required, escalation_target, escalation_due_at, escalation_reason
FROM base
ON CONFLICT (route, rule_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  delegator = EXCLUDED.delegator,
  delegate = EXCLUDED.delegate,
  scope = EXCLUDED.scope,
  permission = EXCLUDED.permission,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  status = EXCLUDED.status,
  risk_level = EXCLUDED.risk_level,
  risk_score = EXCLUDED.risk_score,
  escalation_required = EXCLUDED.escalation_required,
  escalation_target = EXCLUDED.escalation_target,
  escalation_due_at = EXCLUDED.escalation_due_at,
  escalation_reason = EXCLUDED.escalation_reason;

DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM dos.ui_route_delegation_rule
  WHERE route = '/foundation/delegations';

  IF cnt < 5 THEN
    RAISE EXCEPTION 'delegations lifecycle assertion failed: expected >= 5 foundation delegation rules, got %', cnt;
  END IF;
END $$;

COMMIT;
