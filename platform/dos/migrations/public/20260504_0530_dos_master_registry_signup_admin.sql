-- 20260504_0530_dos_master_registry_signup_admin.sql
-- DOS MASTER PLAN — M1 Day 4 (closes M1).
-- Service registry (4) + Onboarding (4) + Signup (4) + Provisioning (4)
-- + Audit extensions (3) + Platform-admin (4) + Doctrine (3) = 26 tables.
--
-- IMPORTANT: To avoid colliding with the legacy `dos.product_registry`,
-- `dos.service_endpoints`, etc. owned by `dos_migrator`, all DOS Master
-- M1 D4 control tables live in a fresh `dos_master` schema. The legacy
-- runtime tables remain untouched; M2..M14 will incrementally migrate
-- consumers off them via the deletion ledger.
-- Idempotent.

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos_master;
CREATE SCHEMA IF NOT EXISTS platform_admin;

-- =============== SERVICE REGISTRY (4) ===============
CREATE TABLE IF NOT EXISTS dos_master.service_registry (
  service_code text PRIMARY KEY,
  display_name text NOT NULL,
  trust_zone   text NOT NULL CHECK (trust_zone IN ('public','tenant','admin')),
  port         int  NOT NULL,
  pm2_name     text,
  status       text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','draining','retired')),
  registered_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dos_master.service_endpoint (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code text NOT NULL REFERENCES dos_master.service_registry(service_code) ON DELETE CASCADE,
  method       text NOT NULL,
  path         text NOT NULL,
  zod_schema_ref text,
  permission_required text,
  UNIQUE (service_code, method, path)
);
CREATE TABLE IF NOT EXISTS dos_master.service_dependency (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  src_code  text NOT NULL REFERENCES dos_master.service_registry(service_code) ON DELETE CASCADE,
  dst_code  text NOT NULL REFERENCES dos_master.service_registry(service_code) ON DELETE CASCADE,
  dep_kind  text NOT NULL,
  UNIQUE (src_code, dst_code, dep_kind),
  CHECK (src_code <> dst_code)
);
CREATE TABLE IF NOT EXISTS dos_master.service_health_history (
  id          bigserial PRIMARY KEY,
  service_code text NOT NULL REFERENCES dos_master.service_registry(service_code) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL DEFAULT now(),
  status      text NOT NULL CHECK (status IN ('green','yellow','red')),
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- =============== ONBOARDING (4) ===============
CREATE TABLE IF NOT EXISTS dos_master.product_registry (
  product_code text PRIMARY KEY,
  display_name text NOT NULL,
  edition_default text,
  marketing_root text,
  workspace_root text,
  status       text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','beta','retired'))
);
CREATE TABLE IF NOT EXISTS dos_master.product_module_enrollment (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL REFERENCES dos_master.product_registry(product_code) ON DELETE CASCADE,
  module_code  text NOT NULL,
  edition      text NOT NULL DEFAULT 'standard',
  enabled      boolean NOT NULL DEFAULT true,
  UNIQUE (product_code, module_code, edition)
);
CREATE TABLE IF NOT EXISTS dos_master.product_landing_page (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL REFERENCES dos_master.product_registry(product_code) ON DELETE CASCADE,
  surface      text NOT NULL CHECK (surface IN ('marketing','workspace','admin')),
  route        text NOT NULL,
  archetype    text NOT NULL,
  UNIQUE (product_code, surface)
);
CREATE TABLE IF NOT EXISTS dos_master.product_brand_kit (
  product_code text PRIMARY KEY REFERENCES dos_master.product_registry(product_code) ON DELETE CASCADE,
  brand        jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- =============== SIGNUP (4) ===============
CREATE TABLE IF NOT EXISTS dos_master.signup_flow (
  flow_code    text PRIMARY KEY,
  product_code text NOT NULL REFERENCES dos_master.product_registry(product_code) ON DELETE CASCADE,
  display_name text NOT NULL,
  enabled      boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS dos_master.signup_flow_step (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_code    text NOT NULL REFERENCES dos_master.signup_flow(flow_code) ON DELETE CASCADE,
  step_order   int NOT NULL,
  step_kind    text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (flow_code, step_order)
);
CREATE TABLE IF NOT EXISTS dos_master.signup_attempt (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_code    text NOT NULL REFERENCES dos_master.signup_flow(flow_code) ON DELETE CASCADE,
  email        text,
  ip_addr      inet,
  device_fp    text,
  status       text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','succeeded','failed','blocked')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  tenant_id    uuid
);
CREATE INDEX IF NOT EXISTS ix_dms_sa_email ON dos_master.signup_attempt (email);
CREATE INDEX IF NOT EXISTS ix_dms_sa_ip    ON dos_master.signup_attempt (ip_addr);
CREATE TABLE IF NOT EXISTS dos_master.signup_anti_abuse_signal (
  id           bigserial PRIMARY KEY,
  attempt_id   uuid NOT NULL REFERENCES dos_master.signup_attempt(id) ON DELETE CASCADE,
  signal_kind  text NOT NULL,
  score        numeric NOT NULL,
  detail       jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at  timestamptz NOT NULL DEFAULT now()
);

-- =============== PROVISIONING (4) ===============
CREATE TABLE IF NOT EXISTS dos_master.provisioning_job (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid,
  product_code text NOT NULL,
  edition      text NOT NULL DEFAULT 'standard',
  temporal_workflow_id text,
  status       text NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued','running','succeeded','failed','compensated')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz
);
CREATE TABLE IF NOT EXISTS dos_master.provisioning_step (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id    uuid NOT NULL REFERENCES dos_master.provisioning_job(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  step_kind text NOT NULL,
  payload   jsonb NOT NULL DEFAULT '{}'::jsonb,
  status    text NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending','running','succeeded','failed','compensated')),
  UNIQUE (job_id, step_order)
);
CREATE TABLE IF NOT EXISTS dos_master.provisioning_compensation (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id   uuid NOT NULL REFERENCES dos_master.provisioning_step(id) ON DELETE CASCADE,
  ran_at    timestamptz NOT NULL DEFAULT now(),
  outcome   text NOT NULL,
  detail    jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS dos_master.provisioning_handle (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id    uuid NOT NULL REFERENCES dos_master.provisioning_job(id) ON DELETE CASCADE,
  handle_kind text NOT NULL,
  handle_ref  text NOT NULL,
  UNIQUE (job_id, handle_kind, handle_ref)
);

-- =============== AUDIT EXTENSIONS (3) ===============
CREATE TABLE IF NOT EXISTS dos_master.audit_decision_ledger (
  id            bigserial PRIMARY KEY,
  decided_at    timestamptz NOT NULL DEFAULT now(),
  actor         text NOT NULL,
  decision_kind text NOT NULL,
  resource_kind text,
  resource_key  text,
  outcome       text NOT NULL CHECK (outcome IN ('allow','deny','soft-deny','escalate')),
  reasoning     jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id uuid
);
CREATE INDEX IF NOT EXISTS ix_dm_adl_actor_time ON dos_master.audit_decision_ledger (actor, decided_at DESC);

CREATE TABLE IF NOT EXISTS dos_master.audit_actor_chain (
  id              bigserial PRIMARY KEY,
  correlation_id  uuid NOT NULL,
  hop_order       int NOT NULL,
  from_actor      text NOT NULL,
  to_actor        text NOT NULL,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (correlation_id, hop_order)
);

CREATE TABLE IF NOT EXISTS dos_master.audit_event_extension (
  id            bigserial PRIMARY KEY,
  audit_event_id bigint NOT NULL,
  extension_key text NOT NULL,
  extension_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (audit_event_id, extension_key)
);

-- =============== PLATFORM-ADMIN (4) ===============
CREATE TABLE IF NOT EXISTS platform_admin.platform_admin_user (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL UNIQUE,
  display_name text NOT NULL,
  status       text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','suspended','retired')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_admin.platform_admin_role (
  role_code    text PRIMARY KEY,
  display_name text NOT NULL,
  pillar       text NOT NULL CHECK (pillar IN ('DNOC','DSOC','DOS','DAuth','ALL')),
  description  text
);
CREATE TABLE IF NOT EXISTS platform_admin.platform_admin_grant (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES platform_admin.platform_admin_user(id) ON DELETE CASCADE,
  role_code    text NOT NULL REFERENCES platform_admin.platform_admin_role(role_code) ON DELETE CASCADE,
  granted_at   timestamptz NOT NULL DEFAULT now(),
  granted_by   text NOT NULL,
  revoked_at   timestamptz,
  UNIQUE (user_id, role_code)
);
CREATE TABLE IF NOT EXISTS platform_admin.platform_admin_session (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES platform_admin.platform_admin_user(id) ON DELETE CASCADE,
  jwe          text NOT NULL,
  issued_at    timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  mtls_fingerprint text,
  revoked_at   timestamptz
);
INSERT INTO platform_admin.platform_admin_role (role_code, display_name, pillar, description) VALUES
  ('platform-admin-dnoc', 'Platform DNOC Admin', 'DNOC', 'Network operations console'),
  ('platform-admin-dsoc', 'Platform DSOC Admin', 'DSOC', 'Security operations console'),
  ('platform-admin-dos',  'Platform DOS Admin',  'DOS',  'Data/Schema operations console'),
  ('platform-admin-dauth','Platform DAuth Admin','DAuth','Identity operations console'),
  ('platform-admin-root', 'Platform Root Admin', 'ALL',  'All four pillars + DOS Master writer')
ON CONFLICT (role_code) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description;

-- =============== DOCTRINE (3) ===============
CREATE TABLE IF NOT EXISTS dos_master.doctrine_article (
  article_no   int PRIMARY KEY,
  title        text NOT NULL,
  body         text NOT NULL,
  enforced_by  text NOT NULL,
  locked_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dos_master.doctrine_violation (
  id           bigserial PRIMARY KEY,
  detected_at  timestamptz NOT NULL DEFAULT now(),
  article_no   int NOT NULL REFERENCES dos_master.doctrine_article(article_no),
  detector     text NOT NULL,
  resource_key text,
  detail       jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at  timestamptz
);
CREATE TABLE IF NOT EXISTS dos_master.doctrine_acknowledgement (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor        text NOT NULL,
  article_no   int NOT NULL REFERENCES dos_master.doctrine_article(article_no),
  ack_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor, article_no)
);

INSERT INTO dos_master.doctrine_article(article_no, title, body, enforced_by) VALUES
  (1, 'One AccessStore', 'Canonical = @dos/access-store', 'forbid-legacy-accessstore.mjs'),
  (2, 'One BFF for workspace bootstrap', '/api/workspace/bootstrap (JWE-signed)', 'forbid-direct-bootstrap-fan-out.mjs'),
  (3, 'DB owns UI', 'All routes/nav/widgets/archetypes/props live in dos.ui_*', 'static-route-ban.mjs'),
  (4, 'Three trust zones', 'public / tenant / platform-admin (separate everything)', 'trust-zone-isolation.mjs'),
  (5, 'No fake-green', 'No any/$any/skip/stub/exclude/loosen/disable', 'fake-green-detector.mjs'),
  (6, 'Vertical slice DoD', 'GREEN_WORKING only when nav→route→component→API→handler→DB→permission→audit→UI all pass', 'vertical-slice-doctrine.mjs'),
  (7, 'Progressive Production Delivery', 'Every change rides ring R0→R5 with gates and auto-rollback', 'ppd-ring-required.mjs'),
  (8, 'Carbon only', 'All UI primitives are vendor=ibm-carbon', 'trg_carbon_only_runtime'),
  (9, 'CLI ↔ UI parity', 'Every CLI has a matching UI page and vice versa', 'cli-ui-parity.mjs'),
  (10, 'Deletion ledger', 'Every legacy path slated for removal is tracked', 'deletion-ledger-progress.mjs'),
  (11, 'DOS Master is the only writer', 'All controlled tables enforce trg_dos_master_only', 'dos-master-writer.mjs')
ON CONFLICT (article_no) DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body, enforced_by=EXCLUDED.enforced_by;

-- =====================================================================
-- Attach trg_dos_master_only to all 26.
-- =====================================================================
DO $attach$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind='r' AND (
       (n.nspname='dos_master' AND c.relname IN (
         'service_registry','service_endpoint','service_dependency','service_health_history',
         'product_registry','product_module_enrollment','product_landing_page','product_brand_kit',
         'signup_flow','signup_flow_step','signup_attempt','signup_anti_abuse_signal',
         'provisioning_job','provisioning_step','provisioning_compensation','provisioning_handle',
         'audit_decision_ledger','audit_actor_chain','audit_event_extension',
         'doctrine_article','doctrine_violation','doctrine_acknowledgement'
       ))
       OR (n.nspname='platform_admin' AND c.relname IN (
         'platform_admin_user','platform_admin_role','platform_admin_grant','platform_admin_session'
       ))
    )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_dos_master_only_%I ON %I.%I', r.relname, r.nspname, r.relname);
    EXECUTE format(
      'CREATE TRIGGER trg_dos_master_only_%I BEFORE INSERT OR UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION dos.trg_dos_master_only()',
      r.relname, r.nspname, r.relname
    );
  END LOOP;
END
$attach$;

COMMIT;
