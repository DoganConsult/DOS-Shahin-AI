-- Phase M0.5 — Agent Registry + Module Bindings + Agent-Tile Brand Assets.
-- Owner: ai-engine-service (data) + ui-os-service (resolution).
--
-- Adds:
--   ① dos.agent_registry            — one row per logical agent (A01..A10).
--   ② dos.agent_module_binding      — many-to-many enrolment: agent ↔ module.
--   ③ Extends dos.marketing_brand_assets.asset_kind to include 'agent-tile'.
--   ④ Seeds 9 agent rows (A01,A02,A04..A10 — A03 not delivered).
--   ⑤ Seeds 9 agent-tile asset rows for the shahin-ai brand pointing at
--      the 512px crop directory.
--
-- Carbon-only contract preserved: these are agent + brand-asset rows, not
-- Dynamic-UI component rows. trg_carbon_only_runtime is unaffected.
--
-- Forward-only and idempotent.

BEGIN;

-- =====================================================================
-- 1. dos.agent_registry — logical agent declarations.
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.agent_registry (
  agent_code         TEXT NOT NULL PRIMARY KEY,
  display_name_en    TEXT NOT NULL,
  display_name_ar    TEXT NOT NULL,
  role_key           TEXT NOT NULL,
  capabilities       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  permission_key     TEXT NOT NULL,
  brand_tile_kind    TEXT NOT NULL DEFAULT 'agent-tile',
  status             TEXT NOT NULL DEFAULT 'active',
  confidence_default NUMERIC(3,2) NOT NULL DEFAULT 0.75,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_registry_status_chk CHECK (status IN ('active','retired','draft')),
  CONSTRAINT agent_registry_brand_tile_chk CHECK (brand_tile_kind = 'agent-tile'),
  CONSTRAINT agent_registry_conf_chk
    CHECK (confidence_default >= 0 AND confidence_default <= 1),
  CONSTRAINT agent_registry_code_chk
    CHECK (agent_code ~ '^A[0-9]{2}$')
);

COMMENT ON TABLE dos.agent_registry IS
  'M0.5 agentic registry — one row per logical agent (A01..An).';

-- =====================================================================
-- 2. dos.agent_module_binding — enrol an agent into a module.
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.agent_module_binding (
  agent_code         TEXT NOT NULL REFERENCES dos.agent_registry(agent_code)
                                     ON DELETE CASCADE ON UPDATE CASCADE,
  module_code        TEXT NOT NULL,
  workbench_route    TEXT,
  audit_route        TEXT,
  followup_route     TEXT,
  enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_module_binding_pk PRIMARY KEY (agent_code, module_code)
);

COMMENT ON TABLE dos.agent_module_binding IS
  'M0.5 — per-module enrolment of agents (M:N agent×module).';

-- =====================================================================
-- 3. Extend dos.marketing_brand_assets.asset_kind to include 'agent-tile'.
-- =====================================================================
ALTER TABLE dos.marketing_brand_assets
  DROP CONSTRAINT IF EXISTS marketing_brand_assets_kind_chk;
ALTER TABLE dos.marketing_brand_assets
  ADD  CONSTRAINT marketing_brand_assets_kind_chk
       CHECK (asset_kind IN
         ('logo-eagle','logo-wordmark','logo-lockup','favicon','og-image',
          'hero-bg','agent-tile'));

-- Allow optional asset_code so multiple agent-tile rows can coexist per brand
-- (eagle/favicon/og-image stay singular per theme/locale/direction).
ALTER TABLE dos.marketing_brand_assets
  ADD COLUMN IF NOT EXISTS asset_code TEXT;

-- Replace the active-row uniqueness index to include asset_code.
DROP INDEX IF EXISTS dos.marketing_brand_assets_match_uq;
CREATE UNIQUE INDEX IF NOT EXISTS marketing_brand_assets_match_uq
  ON dos.marketing_brand_assets
  (brand_code, asset_kind, theme,
   COALESCE(locale, ''), COALESCE(direction, ''), COALESCE(asset_code, ''))
  WHERE active = TRUE;

-- =====================================================================
-- 4. Seed 9 agents (A01,A02,A04..A10).
-- =====================================================================
INSERT INTO dos.agent_registry
  (agent_code, display_name_en, display_name_ar, role_key, capabilities,
   permission_key, brand_tile_kind, status, confidence_default)
VALUES
  ('A01','Onboarding Agent','وكيل التهيئة','onboarding',
     ARRAY['observe','suggest','execute'],'agent.onboarding.run','agent-tile','active',0.85),
  ('A02','Identity Provisioning Agent','وكيل توفير الهوية','identity',
     ARRAY['observe','suggest','approve','execute','verify'],'agent.identity.provision','agent-tile','active',0.80),
  ('A04','Control Authoring Agent','وكيل تأليف الضوابط','controls',
     ARRAY['observe','suggest','execute','verify'],'agent.controls.author','agent-tile','active',0.78),
  ('A05','Evidence Collection Agent','وكيل جمع الأدلة','evidence',
     ARRAY['observe','execute','verify','log'],'agent.evidence.collect','agent-tile','active',0.82),
  ('A06','Gap Remediation Agent','وكيل معالجة الفجوات','remediation',
     ARRAY['observe','suggest','approve','execute'],'agent.remediation.run','agent-tile','active',0.74),
  ('A07','Risk Register Agent','وكيل سجل المخاطر','risk',
     ARRAY['observe','suggest','log'],'agent.risk.register','agent-tile','active',0.80),
  ('A08','Policy Lifecycle Agent','وكيل دورة حياة السياسات','policy',
     ARRAY['observe','suggest','approve','execute'],'agent.policy.lifecycle','agent-tile','active',0.77),
  ('A09','Third-Party Risk Agent','وكيل مخاطر الأطراف الثالثة','vendor',
     ARRAY['observe','suggest','verify'],'agent.vendor.risk','agent-tile','active',0.76),
  ('A10','Audit Reporting Agent','وكيل تقارير التدقيق','audit',
     ARRAY['observe','execute','log'],'agent.audit.report','agent-tile','active',0.83)
ON CONFLICT (agent_code) DO NOTHING;

-- =====================================================================
-- 5. Default module bindings (one canonical owner per agent).
-- =====================================================================
INSERT INTO dos.agent_module_binding
  (agent_code, module_code, workbench_route, audit_route, followup_route)
VALUES
  ('A01','onboarding','/onboarding/agent','/onboarding/audit','/onboarding/followups'),
  ('A02','identity','/identity/agent','/identity/audit','/identity/followups'),
  ('A04','controls','/controls/agent','/controls/audit','/controls/followups'),
  ('A05','evidence','/evidence/agent','/evidence/audit','/evidence/followups'),
  ('A06','remediation','/remediation/agent','/remediation/audit','/remediation/followups'),
  ('A07','risk','/risk/agent','/risk/audit','/risk/followups'),
  ('A08','policy','/policy/agent','/policy/audit','/policy/followups'),
  ('A09','vendor','/vendor/agent','/vendor/audit','/vendor/followups'),
  ('A10','audit','/audit/agent','/audit/timeline','/audit/followups')
ON CONFLICT (agent_code, module_code) DO NOTHING;

-- =====================================================================
-- 6. Seed 9 agent-tile brand assets for shahin-ai (512px PNG crops).
--    File source: products/shahin-ai/shahin_agent_assets_crop/web_512_tiles/.
-- =====================================================================
INSERT INTO dos.marketing_brand_assets
  (brand_code, asset_kind, asset_code, theme, locale, direction, source_kind,
   svg, url, mime, width, height, alt_en, alt_ar, version)
VALUES
  ('shahin-ai','agent-tile','A01','light',NULL,NULL,'url',NULL,
   '/assets/brand/shahin-ai/agents/A01_onboarding_agent_tile_512.png','image/png',
   512,512,'Onboarding Agent','وكيل التهيئة',1),
  ('shahin-ai','agent-tile','A02','light',NULL,NULL,'url',NULL,
   '/assets/brand/shahin-ai/agents/A02_identity_provisioning_agent_tile_512.png','image/png',
   512,512,'Identity Provisioning Agent','وكيل توفير الهوية',1),
  ('shahin-ai','agent-tile','A04','light',NULL,NULL,'url',NULL,
   '/assets/brand/shahin-ai/agents/A04_control_authoring_agent_tile_512.png','image/png',
   512,512,'Control Authoring Agent','وكيل تأليف الضوابط',1),
  ('shahin-ai','agent-tile','A05','light',NULL,NULL,'url',NULL,
   '/assets/brand/shahin-ai/agents/A05_evidence_collection_agent_tile_512.png','image/png',
   512,512,'Evidence Collection Agent','وكيل جمع الأدلة',1),
  ('shahin-ai','agent-tile','A06','light',NULL,NULL,'url',NULL,
   '/assets/brand/shahin-ai/agents/A06_gap_remediation_agent_tile_512.png','image/png',
   512,512,'Gap Remediation Agent','وكيل معالجة الفجوات',1),
  ('shahin-ai','agent-tile','A07','light',NULL,NULL,'url',NULL,
   '/assets/brand/shahin-ai/agents/A07_risk_register_agent_tile_512.png','image/png',
   512,512,'Risk Register Agent','وكيل سجل المخاطر',1),
  ('shahin-ai','agent-tile','A08','light',NULL,NULL,'url',NULL,
   '/assets/brand/shahin-ai/agents/A08_policy_lifecycle_agent_tile_512.png','image/png',
   512,512,'Policy Lifecycle Agent','وكيل دورة حياة السياسات',1),
  ('shahin-ai','agent-tile','A09','light',NULL,NULL,'url',NULL,
   '/assets/brand/shahin-ai/agents/A09_third_party_risk_agent_tile_512.png','image/png',
   512,512,'Third-Party Risk Agent','وكيل مخاطر الأطراف الثالثة',1),
  ('shahin-ai','agent-tile','A10','light',NULL,NULL,'url',NULL,
   '/assets/brand/shahin-ai/agents/A10_audit_reporting_agent_tile_512.png','image/png',
   512,512,'Audit Reporting Agent','وكيل تقارير التدقيق',1)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- 7. Sanity guard.
-- =====================================================================
DO $$
DECLARE
  cnt INT;
BEGIN
  SELECT count(*) INTO cnt FROM dos.agent_registry WHERE status='active';
  IF cnt < 9 THEN
    RAISE EXCEPTION '[agent-registry] expected >=9 active agents, got %', cnt;
  END IF;
  SELECT count(*) INTO cnt FROM dos.agent_module_binding WHERE enabled=TRUE;
  IF cnt < 9 THEN
    RAISE EXCEPTION '[agent-registry] expected >=9 module bindings, got %', cnt;
  END IF;
  SELECT count(*) INTO cnt FROM dos.marketing_brand_assets
    WHERE brand_code='shahin-ai' AND asset_kind='agent-tile' AND active=TRUE;
  IF cnt < 9 THEN
    RAISE EXCEPTION '[agent-registry] expected >=9 agent-tile assets for shahin-ai, got %', cnt;
  END IF;
END $$;

COMMIT;
