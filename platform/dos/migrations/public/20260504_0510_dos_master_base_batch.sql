-- 20260504_0510_dos_master_base_batch.sql
-- DOS MASTER PLAN — M1 Day 2.
-- Adds the 7 remaining base controlled tables and attaches the
-- writer-trust trigger to each. Idempotent.

BEGIN;

-- ① change_request — every controlled write SHOULD reference one.
CREATE TABLE IF NOT EXISTS dos.dos_master_change_request (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  summary         text,
  requested_by    text        NOT NULL,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  approved_by     text,
  approved_at     timestamptz,
  status          text        NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','approved','executed','rolled_back','rejected')),
  rollout_plan_id uuid,
  payload         jsonb       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS ix_dmcr_status ON dos.dos_master_change_request (status, requested_at DESC);

-- ② actor_session — issued JWE handles for service-actors.
CREATE TABLE IF NOT EXISTS dos.dos_master_actor_session (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor        text NOT NULL,
  session_jwe  text NOT NULL,
  issued_at    timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  scopes       text[] NOT NULL DEFAULT ARRAY[]::text[]
);
CREATE INDEX IF NOT EXISTS ix_dmas_actor_active
  ON dos.dos_master_actor_session (actor) WHERE revoked_at IS NULL;

-- ③ lock — advisory lock ledger across multi-writer batches.
CREATE TABLE IF NOT EXISTS dos.dos_master_lock (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_key  text        NOT NULL,
  held_by       text        NOT NULL,
  acquired_at   timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  released_at   timestamptz,
  UNIQUE (resource_key) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS ix_dml_active
  ON dos.dos_master_lock (resource_key) WHERE released_at IS NULL;

-- ④ drift_event — emitted by reconcilers (mv_workspace_bootstrap stale, etc).
CREATE TABLE IF NOT EXISTS dos.dos_master_drift_event (
  id              bigserial PRIMARY KEY,
  detected_at     timestamptz NOT NULL DEFAULT now(),
  source          text        NOT NULL,
  drift_kind      text        NOT NULL,
  resource_key    text,
  detail          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  resolved_at     timestamptz,
  resolution_note text
);
CREATE INDEX IF NOT EXISTS ix_dmde_open
  ON dos.dos_master_drift_event (source, detected_at DESC) WHERE resolved_at IS NULL;

-- ⑤ compensation_chain — header for ordered Saga steps.
CREATE TABLE IF NOT EXISTS dos.dos_master_compensation_chain (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id uuid REFERENCES dos.dos_master_change_request(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','running','succeeded','failed','compensated')),
  step_count      int  NOT NULL DEFAULT 0
);

-- ⑥ publish_handle — points active publish revision per (target, channel).
CREATE TABLE IF NOT EXISTS dos.dos_master_publish_handle (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind   text NOT NULL,
  target_key    text NOT NULL,
  channel       text NOT NULL DEFAULT 'live'
                  CHECK (channel IN ('draft','staging','live','rolled_back')),
  revision_id   uuid NOT NULL,
  activated_at  timestamptz NOT NULL DEFAULT now(),
  activated_by  text NOT NULL,
  UNIQUE (target_kind, target_key, channel) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS ix_dmph_target
  ON dos.dos_master_publish_handle (target_kind, target_key);

-- ⑦ invalidation_log — every SSE bootstrap-invalidate fan-out.
CREATE TABLE IF NOT EXISTS dos.dos_master_invalidation_log (
  id              bigserial PRIMARY KEY,
  emitted_at      timestamptz NOT NULL DEFAULT now(),
  scope           text NOT NULL CHECK (scope IN ('tenant','role','module','permission','global')),
  scope_key       text,
  reason          text NOT NULL,
  cache_version   text NOT NULL,
  fan_out_count   int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_dmil_scope_time
  ON dos.dos_master_invalidation_log (scope, emitted_at DESC);

-- =====================================================================
-- Attach trg_dos_master_only to all 7.
-- =====================================================================
DO $attach$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'dos_master_change_request',
    'dos_master_actor_session',
    'dos_master_lock',
    'dos_master_drift_event',
    'dos_master_compensation_chain',
    'dos_master_publish_handle',
    'dos_master_invalidation_log'
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
