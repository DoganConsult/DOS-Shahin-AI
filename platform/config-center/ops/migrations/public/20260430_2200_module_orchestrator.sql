-- ════════════════════════════════════════════════════════════════════════
-- Module Orchestrator — golden-ready / pool-warmed / capability sharing
--
-- Tables introduced:
--   dos.module_readiness            — per-module verdict (G1..G12 + G-AI)
--   dos.module_pool_slots           — hot pool of pre-built module schemas
--   dos.module_capabilities         — registry of provider capabilities
--   dos.module_capability_bindings  — consumer→provider declared bindings
--   dos.tenant_modules              — per-tenant enrollment + state
--
-- Idempotent. Forward-only. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1. Module readiness verdict (one row per module_code/version) ───────
CREATE TABLE IF NOT EXISTS dos.module_readiness (
  module_code      TEXT NOT NULL,
  module_version   TEXT NOT NULL,
  verdict          TEXT NOT NULL CHECK (verdict IN ('GOLDEN_READY','DRIFT','BLOCKED','UNKNOWN')),
  gates            JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence         JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  computed_by      TEXT NOT NULL DEFAULT 'verifier',
  PRIMARY KEY (module_code, module_version)
);
CREATE INDEX IF NOT EXISTS idx_module_readiness_verdict
  ON dos.module_readiness(verdict, computed_at DESC);

-- ── 2. Module pool slots (pool_warmed mode) ──────────────────────────────
CREATE TABLE IF NOT EXISTS dos.module_pool_slots (
  slot_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code       TEXT NOT NULL,
  module_version    TEXT NOT NULL,
  schema_template   TEXT NOT NULL,
  state             TEXT NOT NULL DEFAULT 'building'
                    CHECK (state IN ('building','hot','attached','draining','failed')),
  built_at          TIMESTAMPTZ,
  attached_tenant   TEXT,
  attached_at       TIMESTAMPTZ,
  build_log         JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_code, schema_template)
);
CREATE INDEX IF NOT EXISTS idx_pool_slots_hot
  ON dos.module_pool_slots(module_code, state) WHERE state = 'hot';
CREATE INDEX IF NOT EXISTS idx_pool_slots_state
  ON dos.module_pool_slots(state, module_code);

-- ── 3. Module capabilities registry ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.module_capabilities (
  capability_key    TEXT PRIMARY KEY,
  provider_module   TEXT NOT NULL,
  provider_version  TEXT NOT NULL,
  shape_ref         TEXT NOT NULL,
  http_route        TEXT,
  fga_relation      TEXT,
  description       TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_capabilities_provider
  ON dos.module_capabilities(provider_module) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS dos.module_capability_bindings (
  consumer_module   TEXT NOT NULL,
  capability_key    TEXT NOT NULL REFERENCES dos.module_capabilities(capability_key) ON DELETE CASCADE,
  semver_range      TEXT NOT NULL DEFAULT '*',
  is_required       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (consumer_module, capability_key)
);

-- ── 4. Per-tenant module enrollment ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.tenant_modules (
  tenant_id          TEXT NOT NULL,
  module_code        TEXT NOT NULL,
  module_version     TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'eligible'
                     CHECK (status IN ('eligible','attaching','active','failed','draining','disabled')),
  provisioning_mode  TEXT NOT NULL DEFAULT 'eager'
                     CHECK (provisioning_mode IN ('eager','on_demand','pool_warmed')),
  attached_slot_id   UUID REFERENCES dos.module_pool_slots(slot_id) ON DELETE SET NULL,
  materialized_at    TIMESTAMPTZ,
  last_error         TEXT,
  idempotency_key    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, module_code)
);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_status
  ON dos.tenant_modules(status, module_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_modules_idem
  ON dos.tenant_modules(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ── 5. Seed initial UNKNOWN readiness rows for every existing module ─────
INSERT INTO dos.module_readiness (module_code, module_version, verdict, gates, evidence, computed_by)
VALUES
  ('foundation','2.0.0','UNKNOWN','{}'::jsonb,'{"note":"awaiting first verify:module run"}'::jsonb,'bootstrap')
ON CONFLICT (module_code, module_version) DO NOTHING;

COMMIT;
