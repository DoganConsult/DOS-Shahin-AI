-- 20260504_0520_dos_master_ppd_publish.sql
-- DOS MASTER PLAN — M1 Day 3.
-- PPD ring engine (8 tables) + Publish engine (4 tables). Idempotent.

BEGIN;

-- ============ PPD ============

CREATE TABLE IF NOT EXISTS dos.rollout_plan (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  change_request_id uuid REFERENCES dos.dos_master_change_request(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    text NOT NULL,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','running','paused','succeeded','failed','rolled_back'))
);

CREATE TABLE IF NOT EXISTS dos.rollout_ring (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES dos.rollout_plan(id) ON DELETE CASCADE,
  ring_code   text NOT NULL CHECK (ring_code IN ('R0','R1','R2','R3','R4','R5')),
  ring_order  int  NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','active','succeeded','failed','rolled_back')),
  started_at  timestamptz,
  ended_at    timestamptz,
  UNIQUE (plan_id, ring_code)
);
CREATE INDEX IF NOT EXISTS ix_rr_plan_order ON dos.rollout_ring (plan_id, ring_order);

CREATE TABLE IF NOT EXISTS dos.rollout_cohort (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ring_id      uuid NOT NULL REFERENCES dos.rollout_ring(id) ON DELETE CASCADE,
  selector_kind text NOT NULL CHECK (selector_kind IN
              ('tenant_id','region','product','edition','route_pattern','slot','archetype','tag')),
  selector_value text NOT NULL,
  weight       int  NOT NULL DEFAULT 100 CHECK (weight BETWEEN 0 AND 100),
  UNIQUE (ring_id, selector_kind, selector_value)
);

CREATE TABLE IF NOT EXISTS dos.rollout_health_gate (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ring_id      uuid NOT NULL REFERENCES dos.rollout_ring(id) ON DELETE CASCADE,
  gate_kind    text NOT NULL CHECK (gate_kind IN
              ('prom_error_rate','jaeger_p95_latency','loki_error_volume','audit_denial_spike','synthetic_pageload')),
  threshold    numeric NOT NULL,
  comparator   text NOT NULL CHECK (comparator IN ('lt','lte','gt','gte','eq')),
  window_sec   int NOT NULL DEFAULT 300,
  UNIQUE (ring_id, gate_kind)
);

CREATE TABLE IF NOT EXISTS dos.rollout_evaluation (
  id           bigserial PRIMARY KEY,
  ring_id      uuid NOT NULL REFERENCES dos.rollout_ring(id) ON DELETE CASCADE,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  decision     text NOT NULL CHECK (decision IN ('hold','advance','rollback')),
  signals      jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS ix_re_ring_time ON dos.rollout_evaluation (ring_id, evaluated_at DESC);

CREATE TABLE IF NOT EXISTS dos.rollout_rollback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ring_id      uuid NOT NULL REFERENCES dos.rollout_ring(id) ON DELETE CASCADE,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  triggered_by text NOT NULL,
  reason       text NOT NULL,
  succeeded_at timestamptz
);

CREATE TABLE IF NOT EXISTS dos.rollout_compensation_step (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id     uuid NOT NULL REFERENCES dos.dos_master_compensation_chain(id) ON DELETE CASCADE,
  step_order   int  NOT NULL,
  step_kind    text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  status       text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','running','succeeded','failed')),
  UNIQUE (chain_id, step_order)
);

CREATE TABLE IF NOT EXISTS dos.rollout_signal_threshold (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_kind  text NOT NULL,
  default_value numeric NOT NULL,
  unit         text NOT NULL,
  notes        text,
  UNIQUE (signal_kind)
);

INSERT INTO dos.rollout_signal_threshold(signal_kind, default_value, unit, notes) VALUES
  ('prom_error_rate',     0.01,  'ratio', 'Hold if 5xx rate exceeds 1%'),
  ('jaeger_p95_latency', 750.0, 'ms',     'Hold if p95 > 750ms'),
  ('loki_error_volume', 100.0,  'cnt/min','Hold if ERROR log lines > 100/min'),
  ('audit_denial_spike',  0.05,  'ratio', 'Hold if AuthZ denial rate > 5%'),
  ('synthetic_pageload',2500.0, 'ms',     'Hold if synthetic page TTFB > 2.5s')
ON CONFLICT (signal_kind) DO NOTHING;

-- ============ PUBLISH ============

CREATE TABLE IF NOT EXISTS dos.publish_revision (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind   text NOT NULL,
  target_key    text NOT NULL,
  revision_no   bigint NOT NULL,
  payload       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    text NOT NULL,
  change_request_id uuid REFERENCES dos.dos_master_change_request(id),
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','staged','live','rolled_back','superseded')),
  UNIQUE (target_kind, target_key, revision_no)
);
CREATE INDEX IF NOT EXISTS ix_pr_target_status ON dos.publish_revision (target_kind, target_key, status);

CREATE TABLE IF NOT EXISTS dos.publish_rollback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id   uuid NOT NULL REFERENCES dos.publish_revision(id) ON DELETE CASCADE,
  rolled_back_at timestamptz NOT NULL DEFAULT now(),
  rolled_back_by text NOT NULL,
  reason        text NOT NULL
);

CREATE TABLE IF NOT EXISTS dos.publish_target (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind   text NOT NULL,
  target_key    text NOT NULL,
  display_name  text NOT NULL,
  owner_team    text,
  notes         text,
  UNIQUE (target_kind, target_key)
);

CREATE TABLE IF NOT EXISTS dos.publish_dependency (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_target_id uuid NOT NULL REFERENCES dos.publish_target(id) ON DELETE CASCADE,
  child_target_id  uuid NOT NULL REFERENCES dos.publish_target(id) ON DELETE CASCADE,
  dep_kind        text NOT NULL,
  UNIQUE (parent_target_id, child_target_id, dep_kind),
  CHECK (parent_target_id <> child_target_id)
);

-- =====================================================================
-- Attach trg_dos_master_only to all 12.
-- =====================================================================
DO $attach$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'rollout_plan','rollout_ring','rollout_cohort','rollout_health_gate',
    'rollout_evaluation','rollout_rollback','rollout_compensation_step','rollout_signal_threshold',
    'publish_revision','publish_rollback','publish_target','publish_dependency'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_dos_master_only_%I ON dos.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_dos_master_only_%I BEFORE INSERT OR UPDATE OR DELETE ON dos.%I FOR EACH ROW EXECUTE FUNCTION dos.trg_dos_master_only()',
      t, t
    );
  END LOOP;
END
$attach$;

COMMIT;
