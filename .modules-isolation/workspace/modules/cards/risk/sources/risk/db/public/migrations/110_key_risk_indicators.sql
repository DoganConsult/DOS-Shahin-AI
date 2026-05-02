-- ============================================================================
-- 110_key_risk_indicators.sql
-- Ported from monolith: backend/src/migrations/tenant/212_key_risk_indicators.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- ============================================
-- Migration 212: Key Risk Indicators (KRI)
-- Routes already exist in risk-workspace.routes.ts
-- Service: risk-workspace.service.ts (getKRIs, createKRIEntry, updateKRIEntry)
-- Table name: risk_kris (verified from service code)
--
-- Phase 3A: tenant/027 creates a minimal risk_kris(id UUID PK, ...) that
-- cannot serve as an FK target for kri_data_points / kri_breach_log
-- (those FK to kri_id, not id). Since 027's risk_kris is a stub with no
-- production data, drop-and-recreate is safe on a fresh tenant schema.
-- ============================================

DROP TABLE IF EXISTS __TENANT_SCHEMA__.risk_kris CASCADE;
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_kris (
  kri_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  linked_risk_id      UUID,
  linked_category     VARCHAR(100),
  owner               VARCHAR(255),
  current_value       NUMERIC(10,2),
  threshold_red       NUMERIC(10,2) DEFAULT 20,
  threshold_amber     NUMERIC(10,2) DEFAULT 12,
  threshold_green     NUMERIC(10,2) DEFAULT 6,
  status              VARCHAR(30) DEFAULT 'normal',
  trend               VARCHAR(20) DEFAULT 'stable',
  collection_frequency VARCHAR(30) DEFAULT 'monthly',
  last_collected_at   TIMESTAMPTZ,
  created_by          VARCHAR(64),
  updated_by          VARCHAR(64),
  deleted_by          VARCHAR(64),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);
-- Defensive: ensure audit columns exist if table pre-existed from earlier migration
DO $$ BEGIN ALTER TABLE __TENANT_SCHEMA__.risk_kris ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE __TENANT_SCHEMA__.risk_kris ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE __TENANT_SCHEMA__.risk_kris ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE __TENANT_SCHEMA__.risk_kris ADD COLUMN IF NOT EXISTS created_by VARCHAR(64); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE __TENANT_SCHEMA__.risk_kris ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(64); EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_risk_kris_status ON __TENANT_SCHEMA__.risk_kris(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_kris_risk ON __TENANT_SCHEMA__.risk_kris(linked_risk_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS kri_data_points (
  data_point_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id              UUID NOT NULL REFERENCES risk_kris(kri_id) ON DELETE CASCADE,
  value               NUMERIC(10,2) NOT NULL,
  collected_by        VARCHAR(64),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
DO $$ BEGIN ALTER TABLE kri_data_points ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_kri_dp ON kri_data_points(kri_id, created_at DESC);

CREATE TABLE IF NOT EXISTS kri_breach_log (
  breach_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id              UUID NOT NULL REFERENCES risk_kris(kri_id),
  breach_value        NUMERIC(10,2),
  threshold_breached  VARCHAR(20),
  threshold_value     NUMERIC(10,2),
  linked_risk_id      UUID,
  owner               VARCHAR(255),
  action_taken        TEXT,
  status              VARCHAR(30) DEFAULT 'open',
  breached_at         TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
DO $$ BEGIN ALTER TABLE kri_breach_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_kri_breach ON kri_breach_log(kri_id, breached_at DESC);
