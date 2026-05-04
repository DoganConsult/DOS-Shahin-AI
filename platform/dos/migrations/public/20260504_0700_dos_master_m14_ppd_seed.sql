-- Owner: dos-platform / DOS Master.
--
-- DOS MASTER PLAN — M14 D1.
--
-- Seeds the PPD substrate (R0..R5 ring engine) for the canonical
-- "platform-rollout" plan that every default change rides. Defines
-- 5 health gates per ring (Prom error rate / Jaeger p95 / Loki error
-- volume / audit denial spike / synthetic page-load) and one cohort
-- selector per ring per Article 7 of the doctrine.
--
-- Forward-only and idempotent. All writes pass through trg_dos_master_only.

BEGIN;

DO $seed$
DECLARE
  v_plan_id uuid;
  v_ring_id uuid;
  r RECORD;
BEGIN
  PERFORM set_config('dos.actor', 'dos-master', true);

  -- ① canonical plan
  INSERT INTO dos.rollout_plan (title, status, created_by)
  VALUES ('platform-rollout', 'draft', 'dos-master-cli')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_plan_id FROM dos.rollout_plan
    WHERE title = 'platform-rollout' ORDER BY created_at DESC LIMIT 1;

  -- ② R0..R5 rings
  FOR r IN
    SELECT * FROM (VALUES
      ('R0', 0, 'dev',        'tag',           'env:dev'),
      ('R1', 1, 'internal',   'tag',           'env:internal'),
      ('R2', 2, 'canary',     'tenant_id',     'shahinaicom'),
      ('R3', 3, 'region',     'region',        'me-central-1'),
      ('R4', 4, 'product',    'product',       'shahin-ai'),
      ('R5', 5, 'fleet',      'tag',           'env:fleet')
    ) AS t(code, ord, label, sel_kind, sel_val)
  LOOP
    INSERT INTO dos.rollout_ring (plan_id, ring_code, ring_order, status)
    VALUES (v_plan_id, r.code, r.ord, 'pending')
    ON CONFLICT (plan_id, ring_code) DO NOTHING;

    SELECT id INTO v_ring_id FROM dos.rollout_ring
      WHERE plan_id = v_plan_id AND ring_code = r.code;

    -- cohort selector
    INSERT INTO dos.rollout_cohort (ring_id, selector_kind, selector_value, weight)
    VALUES (v_ring_id, r.sel_kind, r.sel_val, 100)
    ON CONFLICT (ring_id, selector_kind, selector_value) DO NOTHING;

    -- 5 health gates per ring (advance unless any breach)
    INSERT INTO dos.rollout_health_gate (ring_id, gate_kind, threshold, comparator, window_sec) VALUES
      (v_ring_id, 'prom_error_rate',    0.02, 'lt',  300),
      (v_ring_id, 'jaeger_p95_latency', 750,  'lt',  300),
      (v_ring_id, 'loki_error_volume',  100,  'lt',  300),
      (v_ring_id, 'audit_denial_spike', 25,   'lt',  600),
      (v_ring_id, 'synthetic_pageload', 0.95, 'gte', 300)
    ON CONFLICT (ring_id, gate_kind) DO UPDATE
      SET threshold = EXCLUDED.threshold,
          comparator = EXCLUDED.comparator,
          window_sec = EXCLUDED.window_sec;
  END LOOP;
END
$seed$;

COMMIT;
