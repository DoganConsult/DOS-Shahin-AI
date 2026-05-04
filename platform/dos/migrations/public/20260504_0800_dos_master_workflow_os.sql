-- DOS Master Phase 2 — L13 D1 — Workflow OS substrate
-- Controlled tables (writer = dos-master). All writes must run with
-- session GUC `dos.actor='dos-master'`; trg_dos_master_only enforces.
--
-- Doctrine binding: Articles 4 (admin trust zone), 6 (vertical-slice DoD),
-- 7 (PPD-gated rollout), 11 (DOS Master is the only writer).

BEGIN;

-- 1. Workflow definitions (versioned, immutable once published).
CREATE TABLE IF NOT EXISTS dos.workflow_definition (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_key    text NOT NULL,                                  -- e.g. 'tenant.signup', 'access-review.q'
  version         integer NOT NULL DEFAULT 1,
  title           text NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('approval','provisioning','review','remediation','attestation','generic')),
  trust_zone      text NOT NULL CHECK (trust_zone IN ('public','tenant','admin')),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  definition      jsonb NOT NULL,                                 -- DAG: {steps:[{id,kind,next,onError,...}]}
  schema_version  integer NOT NULL DEFAULT 1,
  created_by      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz,
  retired_at      timestamptz,
  UNIQUE (workflow_key, version)
);
CREATE INDEX IF NOT EXISTS ix_workflow_definition_key_status
  ON dos.workflow_definition(workflow_key, status);

-- 2. Workflow instances (runtime).
CREATE TABLE IF NOT EXISTS dos.workflow_instance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     uuid NOT NULL REFERENCES dos.workflow_definition(id),
  tenant_id       uuid,                                           -- nullable for admin-zone workflows
  initiated_by    text NOT NULL,
  status          text NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running','completed','failed','cancelled','suspended')),
  current_step    text,
  context         jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  error           text,
  correlation_id  text                                            -- traces / external request id
);
CREATE INDEX IF NOT EXISTS ix_workflow_instance_status
  ON dos.workflow_instance(workflow_id, status);
CREATE INDEX IF NOT EXISTS ix_workflow_instance_tenant
  ON dos.workflow_instance(tenant_id) WHERE tenant_id IS NOT NULL;

-- 3. Step run log (one row per step transition, append-only).
CREATE TABLE IF NOT EXISTS dos.workflow_step_run (
  id              bigserial PRIMARY KEY,
  instance_id     uuid NOT NULL REFERENCES dos.workflow_instance(id) ON DELETE CASCADE,
  step_id         text NOT NULL,
  step_kind       text NOT NULL,                                  -- task | approval | wait | http | event | branch
  status          text NOT NULL CHECK (status IN ('started','completed','failed','skipped','timed-out','rolled-back')),
  attempt         integer NOT NULL DEFAULT 1,
  input           jsonb,
  output          jsonb,
  error           text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz
);
CREATE INDEX IF NOT EXISTS ix_workflow_step_run_instance
  ON dos.workflow_step_run(instance_id, started_at);

-- 4. Event ledger (signals + decisions, append-only).
CREATE TABLE IF NOT EXISTS dos.workflow_event (
  id              bigserial PRIMARY KEY,
  instance_id     uuid REFERENCES dos.workflow_instance(id) ON DELETE CASCADE,
  workflow_key    text,
  kind            text NOT NULL,                                  -- signal | timer | approval-grant | approval-deny | rollback | error
  payload         jsonb,
  emitted_by      text NOT NULL,
  emitted_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_workflow_event_instance
  ON dos.workflow_event(instance_id, emitted_at);

-- 5. Wire writer-only triggers (Article 11).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workflow_definition',
    'workflow_instance',
    'workflow_step_run',
    'workflow_event'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_dos_master_only_workflow_%I ON dos.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_dos_master_only_workflow_%I
         BEFORE INSERT OR UPDATE OR DELETE ON dos.%I
         FOR EACH ROW EXECUTE FUNCTION trg_dos_master_only()',
      t, t);
  END LOOP;
END $$;

-- 6. Seed: a default 'tenant.signup-trial' workflow definition wired to the
-- existing M7 signup flow so we have a real published workflow to query.
SET LOCAL dos.actor = 'dos-master';
INSERT INTO dos.workflow_definition (
  workflow_key, version, title, kind, trust_zone, status,
  definition, schema_version, created_by, published_at
) VALUES (
  'tenant.signup-trial', 1,
  'Tenant trial signup (M7-aligned)',
  'provisioning', 'public', 'published',
  jsonb_build_object(
    'start', 'collect-email',
    'steps', jsonb_build_array(
      jsonb_build_object('id','collect-email',     'kind','task',     'next','verify-email'),
      jsonb_build_object('id','verify-email',      'kind','wait',     'next','anti-abuse'),
      jsonb_build_object('id','anti-abuse',        'kind','task',     'next','tenant-name'),
      jsonb_build_object('id','tenant-name',       'kind','task',     'next','provision'),
      jsonb_build_object('id','provision',         'kind','task',     'next','launch-workspace'),
      jsonb_build_object('id','launch-workspace',  'kind','task',     'next', null)
    )
  ),
  1, 'dos-master', now()
)
ON CONFLICT (workflow_key, version) DO NOTHING;

COMMIT;
