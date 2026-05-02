-- =====================================================================
-- Phase G T1 — Self-Registration Trial Lifecycle (locked spec)
-- (20260501_0200)
--
-- Creates the 5 platform-DNA tables that Phase G owns:
--   1. dos.tenant_trials              — trial state per tenant+product
--   2. dos.tenant_subscriptions       — subscription state (G shared with H)
--   3. dos.tenant_product_entitlements — product-level entitlement
--   4. dos.tenant_module_entitlements  — module-level entitlement (with limits)
--   5. dos.trial_audit_log             — append-only trial action log
--
-- Phase G owns these tables. Phase H extends `tenant_subscriptions` with
-- `provider_mode` / `provider_ref` columns later — do NOT recreate them
-- in H. Phase H1 adds `dos.billing_plans`, `dos.billing_plan_features`,
-- `dos.billing_audit_log` — those are H1's territory, not this migration.
--
-- Trial states (from §G locked spec):
--   trial_pending_verification → trial_active → trial_expiring →
--   trial_grace → trial_suspended ;
--   branches: trial_converted | trial_cancelled | trial_expired ;
--   terminal: tenant_archived
--
-- Subscription states (from §H locked spec, declared here so G+H align):
--   trialing | active | past_due | grace | suspended |
--   cancelled | expired | converted
--
-- Idempotent: every CREATE / ALTER uses IF NOT EXISTS / IF NOT EXISTS
-- guards. Safe to re-run.
-- =====================================================================

BEGIN;

-- ── 1. dos.tenant_trials ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.tenant_trials (
  trial_id              VARCHAR(32) PRIMARY KEY,
  tenant_id             VARCHAR(16) NOT NULL REFERENCES dos.tenants(tenant_id) ON DELETE CASCADE,
  product_code          VARCHAR(64) NOT NULL,
  plan_code             VARCHAR(64),
  status                VARCHAR(40) NOT NULL DEFAULT 'trial_pending_verification',
  starts_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at               TIMESTAMPTZ NOT NULL,
  grace_ends_at         TIMESTAMPTZ,
  converted_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  suspended_at          TIMESTAMPTZ,
  created_by_user_id    VARCHAR(64),
  signup_domain         VARCHAR(255),
  verification_status   VARCHAR(32) NOT NULL DEFAULT 'pending',
  source                VARCHAR(64) NOT NULL DEFAULT 'self_registration',
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_tenant_trials_status CHECK (status IN (
    'trial_pending_verification','trial_active','trial_expiring',
    'trial_grace','trial_suspended','trial_converted','trial_cancelled',
    'trial_expired','tenant_archived'
  )),
  CONSTRAINT chk_tenant_trials_verification CHECK (verification_status IN (
    'pending','verified','rejected','bypassed'
  ))
);

CREATE INDEX IF NOT EXISTS idx_tenant_trials_tenant_product
  ON dos.tenant_trials(tenant_id, product_code);
CREATE INDEX IF NOT EXISTS idx_tenant_trials_status
  ON dos.tenant_trials(status);
CREATE INDEX IF NOT EXISTS idx_tenant_trials_ends_at
  ON dos.tenant_trials(ends_at) WHERE status IN ('trial_active','trial_expiring','trial_grace');
CREATE INDEX IF NOT EXISTS idx_tenant_trials_signup_domain
  ON dos.tenant_trials(signup_domain) WHERE signup_domain IS NOT NULL;

-- One active trial per (tenant, product). Multiple historical rows ok.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_trials_active
  ON dos.tenant_trials(tenant_id, product_code)
  WHERE status IN ('trial_pending_verification','trial_active','trial_expiring','trial_grace');

-- ── 2. dos.tenant_subscriptions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.tenant_subscriptions (
  subscription_id        VARCHAR(32) PRIMARY KEY,
  tenant_id              VARCHAR(16) NOT NULL REFERENCES dos.tenants(tenant_id) ON DELETE CASCADE,
  product_code           VARCHAR(64) NOT NULL,
  plan_code              VARCHAR(64),
  status                 VARCHAR(32) NOT NULL DEFAULT 'trialing',
  billing_status         VARCHAR(40) NOT NULL DEFAULT 'no_payment_required',
  trial_id               VARCHAR(32) REFERENCES dos.tenant_trials(trial_id) ON DELETE SET NULL,
  current_period_start   TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end     TIMESTAMPTZ,
  grace_ends_at          TIMESTAMPTZ,
  provider_mode          VARCHAR(40) NOT NULL DEFAULT 'manual',
  provider_ref           VARCHAR(255),
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_tenant_subscriptions_status CHECK (status IN (
    'trialing','active','past_due','grace','suspended','cancelled','expired','converted'
  )),
  CONSTRAINT chk_tenant_subscriptions_billing CHECK (billing_status IN (
    'no_payment_required','payment_provider_pending','invoice_pending','invoice_paid',
    'payment_failed','manually_approved','external_provider_active'
  )),
  CONSTRAINT chk_tenant_subscriptions_provider_mode CHECK (provider_mode IN (
    'manual','invoice_offline','payment_provider_pending','external_provider'
  ))
);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_product
  ON dos.tenant_subscriptions(tenant_id, product_code);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status
  ON dos.tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_trial
  ON dos.tenant_subscriptions(trial_id) WHERE trial_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_subscriptions_active
  ON dos.tenant_subscriptions(tenant_id, product_code)
  WHERE status IN ('trialing','active','past_due','grace');

-- ── 3. dos.tenant_product_entitlements ────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.tenant_product_entitlements (
  entitlement_id        VARCHAR(32) PRIMARY KEY,
  tenant_id             VARCHAR(16) NOT NULL REFERENCES dos.tenants(tenant_id) ON DELETE CASCADE,
  product_code          VARCHAR(64) NOT NULL,
  entitlement_status    VARCHAR(32) NOT NULL DEFAULT 'active',
  source                VARCHAR(32) NOT NULL DEFAULT 'trial',
  trial_id              VARCHAR(32) REFERENCES dos.tenant_trials(trial_id) ON DELETE SET NULL,
  subscription_id       VARCHAR(32) REFERENCES dos.tenant_subscriptions(subscription_id) ON DELETE SET NULL,
  starts_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at               TIMESTAMPTZ,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_tenant_product_entitlements_status CHECK (entitlement_status IN (
    'active','expired','suspended','cancelled','pending'
  )),
  CONSTRAINT chk_tenant_product_entitlements_source CHECK (source IN (
    'trial','paid','internal','admin','manual'
  ))
);

CREATE INDEX IF NOT EXISTS idx_tenant_product_entitlements_tenant
  ON dos.tenant_product_entitlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_product_entitlements_status
  ON dos.tenant_product_entitlements(entitlement_status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_product_entitlements_active
  ON dos.tenant_product_entitlements(tenant_id, product_code)
  WHERE entitlement_status = 'active';

-- ── 4. dos.tenant_module_entitlements ─────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.tenant_module_entitlements (
  entitlement_id        VARCHAR(32) PRIMARY KEY,
  tenant_id             VARCHAR(16) NOT NULL REFERENCES dos.tenants(tenant_id) ON DELETE CASCADE,
  product_code          VARCHAR(64) NOT NULL,
  module_code           VARCHAR(64) NOT NULL,
  entitlement_status    VARCHAR(32) NOT NULL DEFAULT 'active',
  source                VARCHAR(32) NOT NULL DEFAULT 'trial',
  trial_id              VARCHAR(32) REFERENCES dos.tenant_trials(trial_id) ON DELETE SET NULL,
  subscription_id       VARCHAR(32) REFERENCES dos.tenant_subscriptions(subscription_id) ON DELETE SET NULL,
  limits_json           JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at               TIMESTAMPTZ,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_tenant_module_entitlements_status CHECK (entitlement_status IN (
    'active','expired','suspended','cancelled','pending','not_entitled'
  )),
  CONSTRAINT chk_tenant_module_entitlements_source CHECK (source IN (
    'trial','paid','internal','admin','manual','platform_dna'
  ))
);

CREATE INDEX IF NOT EXISTS idx_tenant_module_entitlements_tenant
  ON dos.tenant_module_entitlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_module_entitlements_module
  ON dos.tenant_module_entitlements(tenant_id, module_code);
CREATE INDEX IF NOT EXISTS idx_tenant_module_entitlements_status
  ON dos.tenant_module_entitlements(entitlement_status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_module_entitlements_active
  ON dos.tenant_module_entitlements(tenant_id, product_code, module_code)
  WHERE entitlement_status = 'active';

-- ── 5. dos.trial_audit_log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.trial_audit_log (
  audit_id        BIGSERIAL PRIMARY KEY,
  tenant_id       VARCHAR(16) NOT NULL REFERENCES dos.tenants(tenant_id) ON DELETE CASCADE,
  trial_id        VARCHAR(32) REFERENCES dos.tenant_trials(trial_id) ON DELETE SET NULL,
  user_id         VARCHAR(64),
  product_code    VARCHAR(64),
  action          VARCHAR(64) NOT NULL,
  old_status      VARCHAR(40),
  new_status      VARCHAR(40),
  reason          TEXT,
  metadata_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_audit_log_tenant
  ON dos.trial_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trial_audit_log_trial
  ON dos.trial_audit_log(trial_id) WHERE trial_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trial_audit_log_action
  ON dos.trial_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_trial_audit_log_created
  ON dos.trial_audit_log(created_at DESC);

-- ── 6. updated_at triggers ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION dos.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_tenant_trials_updated') THEN
    CREATE TRIGGER trg_tenant_trials_updated BEFORE UPDATE ON dos.tenant_trials
      FOR EACH ROW EXECUTE FUNCTION dos.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_tenant_subscriptions_updated') THEN
    CREATE TRIGGER trg_tenant_subscriptions_updated BEFORE UPDATE ON dos.tenant_subscriptions
      FOR EACH ROW EXECUTE FUNCTION dos.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_tenant_product_entitlements_updated') THEN
    CREATE TRIGGER trg_tenant_product_entitlements_updated BEFORE UPDATE ON dos.tenant_product_entitlements
      FOR EACH ROW EXECUTE FUNCTION dos.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_tenant_module_entitlements_updated') THEN
    CREATE TRIGGER trg_tenant_module_entitlements_updated BEFORE UPDATE ON dos.tenant_module_entitlements
      FOR EACH ROW EXECUTE FUNCTION dos.set_updated_at();
  END IF;
END $$;

-- ── 7. Grants ─────────────────────────────────────────────────────────
-- tenant-service (dos_auth) writes registration bundle.
-- audit-service  (dos_audit) reads + writes audit log.
-- user-service   (dos_user) reads entitlements for resolver.
-- workflow-service (dos_workflow) writes lifecycle transitions.
-- admin-service  (dos_app) reads all + writes via admin endpoints.
-- gateway, ai, others: read-only on entitlements (resolver consumers).
DO $grants$
DECLARE
  r_writer TEXT;
  r_reader TEXT;
BEGIN
  -- Writers (full DML on Phase G tables)
  FOREACH r_writer IN ARRAY ARRAY['dos_auth','dos_audit','dos_user','dos_workflow','dos_app','dos_migrator']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r_writer) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON dos.tenant_trials               TO %I', r_writer);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON dos.tenant_subscriptions        TO %I', r_writer);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON dos.tenant_product_entitlements TO %I', r_writer);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON dos.tenant_module_entitlements  TO %I', r_writer);
      EXECUTE format('GRANT SELECT, INSERT,         UPDATE ON dos.trial_audit_log             TO %I', r_writer);
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE dos.trial_audit_log_audit_id_seq        TO %I', r_writer);
    END IF;
  END LOOP;

  -- Readers (entitlement resolver consumers)
  FOREACH r_reader IN ARRAY ARRAY['dos_gateway','dos_ai','dos_notification','dos_tenant','dos_verifier']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r_reader) THEN
      EXECUTE format('GRANT SELECT ON dos.tenant_trials               TO %I', r_reader);
      EXECUTE format('GRANT SELECT ON dos.tenant_subscriptions        TO %I', r_reader);
      EXECUTE format('GRANT SELECT ON dos.tenant_product_entitlements TO %I', r_reader);
      EXECUTE format('GRANT SELECT ON dos.tenant_module_entitlements  TO %I', r_reader);
    END IF;
  END LOOP;
END $grants$;

-- ── 8. Migration receipt row in dos.schema_migrations (if tracker exists) ─
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='dos' AND table_name='schema_migrations') THEN
    INSERT INTO dos.schema_migrations (filename, checksum, applied_at, applied_by)
      VALUES (
        '20260501_0200_phase_g_trial_lifecycle.sql',
        'phase-g-t1-trial-lifecycle-v1',
        now(),
        CURRENT_USER
      )
      ON CONFLICT (filename) DO NOTHING;
  END IF;
END $$;

COMMIT;
