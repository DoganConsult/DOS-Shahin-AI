-- 20260504_0710_dos_master_workspace_prod_cutover_ppd_seed.sql
-- Owner: dos-platform / DOS Master.
--
-- DOS MASTER PLAN — Progressive Production Cut-Over for workspace-bff.
--
-- Declares the canonical PPD plan "workspace-bff-prod-cutover" with the
-- 6-ring engine (R0..R5), one cohort per ring, and the 5 health gates
-- approved by ops on 2026-05-04 (see chat ledger; doctrine actor
-- doganlap@gmail.com). Tightened thresholds vs the platform-rollout
-- baseline (prom_error_rate 0.01, loki 50/min) per ops sign-off.
--
-- Doctrine binding: Articles 4 (deviation logged separately for M15
-- mTLS+KC), 5, 7, 11. Manual ack required at each ring (D5=b); no
-- fully automated R0->R5. Burn-in 24h per ring (D4=a). Auto-rollback
-- only when real signal is available (E rule); R0 may use stub signals,
-- R2+ requires real Prom/Loki/Jaeger/audit/synthetic adapters.
--
-- Forward-only and idempotent. ALL writes pass through
-- trg_dos_master_only via set_config('dos.actor','dos-master',true).
-- Safe to re-run: ON CONFLICT DO NOTHING on plan/ring/cohort,
-- ON CONFLICT DO UPDATE on health_gate (so threshold changes propagate).
--
-- Scope mapping note: gate_kind values are constrained by
-- rollout_health_gate_gate_kind_check to the 5 generic kinds. Workspace
-- scoping is by plan-title association; RealSignalReader resolves the
-- plan -> metric-label mapping at query time.

BEGIN;

DO $seed$
DECLARE
  v_plan_id uuid;
  v_ring_id uuid;
  r RECORD;
BEGIN
  PERFORM set_config('dos.actor', 'dos-master', true);

  -- 1. Canonical plan (guard-pattern idempotency: dos.rollout_plan has no
  --    UNIQUE on title, so ON CONFLICT cannot be used. Pick existing if
  --    present; insert only when absent.)
  SELECT id INTO v_plan_id FROM dos.rollout_plan
    WHERE title = 'workspace-bff-prod-cutover'
    ORDER BY created_at ASC LIMIT 1;

  IF v_plan_id IS NULL THEN
    INSERT INTO dos.rollout_plan (title, status, created_by)
    VALUES ('workspace-bff-prod-cutover', 'draft', 'dos-master-cli:doganlap@gmail.com')
    RETURNING id INTO v_plan_id;
  END IF;

  -- 2. R0..R5 rings, cohorts, gates
  FOR r IN
    SELECT * FROM (VALUES
      -- code, order, label,    selector_kind, selector_value
      ('R0', 0, 'dev',      'tag',       'env:dev'),
      ('R1', 1, 'internal', 'tag',       'env:internal'),
      ('R2', 2, 'canary',   'tenant_id', 'shahinaicom'),
      ('R3', 3, 'region',   'region',    'me-central-1'),
      ('R4', 4, 'product',  'product',   'shahin-ai'),
      ('R5', 5, 'fleet',    'tag',       'env:fleet')
    ) AS t(code, ord, label, sel_kind, sel_val)
  LOOP
    INSERT INTO dos.rollout_ring (plan_id, ring_code, ring_order, status)
    VALUES (v_plan_id, r.code, r.ord, 'pending')
    ON CONFLICT (plan_id, ring_code) DO NOTHING;

    SELECT id INTO v_ring_id FROM dos.rollout_ring
      WHERE plan_id = v_plan_id AND ring_code = r.code;

    -- one cohort selector per ring (weight=100, full traffic of cohort)
    INSERT INTO dos.rollout_cohort (ring_id, selector_kind, selector_value, weight)
    VALUES (v_ring_id, r.sel_kind, r.sel_val, 100)
    ON CONFLICT (ring_id, selector_kind, selector_value) DO NOTHING;

    -- 5 ops-approved health gates (auto-rollback on breach if real
    -- signal available; NEUTRAL never blocks advance and never triggers
    -- auto-rollback per ops E rule)
    INSERT INTO dos.rollout_health_gate (ring_id, gate_kind, threshold, comparator, window_sec) VALUES
      (v_ring_id, 'prom_error_rate',    0.01, 'lt',  300),  -- < 0.01 5xx ratio (workspace-bff)
      (v_ring_id, 'loki_error_volume',  50,   'lt',  60),   -- < 50/min error log lines (workspace-bff)
      (v_ring_id, 'jaeger_p95_latency', 750,  'lt',  300),  -- < 750ms p95 (workspace-bff)
      (v_ring_id, 'audit_denial_spike', 25,   'lt',  600),  -- < 25 denials / 10min (workspace)
      (v_ring_id, 'synthetic_pageload', 0.95, 'gte', 300)   -- >= 0.95 synthetic_workspace_bootstrap_success
    ON CONFLICT (ring_id, gate_kind) DO UPDATE
      SET threshold  = EXCLUDED.threshold,
          comparator = EXCLUDED.comparator,
          window_sec = EXCLUDED.window_sec;
  END LOOP;
END
$seed$;

COMMIT;
