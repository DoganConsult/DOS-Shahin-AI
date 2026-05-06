-- =====================================================================
-- Foundation-AI Wave 2 — dynamic_ui_page_archetype + page_persona + page_agent
--
-- Adds three canonical tables that bind every Foundation page to:
--   • an archetype          (overview | list | object | workflow | audit | …)
--   • a persona set         (who consumes the page)
--   • an agent set          (which agents observe / draft on the page)
--
-- Doctrine:
--   DB stores → Dynamic UI declares → UI-OS resolves.
--   Frontend renders only normalized UI-OS runtime.
--   These tables are read by services/ui-os-service workspace-runtime resolver.
--
-- Idempotent. Safe to re-run. Self-asserting at tail.
-- =====================================================================

BEGIN;

SET search_path = public;

-- ---------------------------------------------------------------------
-- 1. archetype catalog
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_page_archetype (
  archetype_id      TEXT PRIMARY KEY,
  description_key   TEXT NOT NULL,
  default_layout    TEXT NOT NULL,
  default_zones     JSONB NOT NULL DEFAULT '[]'::jsonb,
  agent_capable     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dyn_ui_page_archetype_layout
  ON dos.dynamic_ui_page_archetype(default_layout);

-- ---------------------------------------------------------------------
-- 2. page → persona binding
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_page_persona (
  module_code   TEXT NOT NULL,
  page_id       TEXT NOT NULL,
  persona_id    TEXT NOT NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (module_code, page_id, persona_id)
);

CREATE INDEX IF NOT EXISTS idx_dyn_ui_page_persona_module
  ON dos.dynamic_ui_page_persona(module_code, page_id);

-- ---------------------------------------------------------------------
-- 3. page → agent binding
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_page_agent (
  module_code   TEXT NOT NULL,
  page_id       TEXT NOT NULL,
  agent_id      TEXT NOT NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  presentation  TEXT NOT NULL DEFAULT 'side-panel',
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (module_code, page_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_dyn_ui_page_agent_module
  ON dos.dynamic_ui_page_agent(module_code, page_id);

CREATE INDEX IF NOT EXISTS idx_dyn_ui_page_agent_agent
  ON dos.dynamic_ui_page_agent(agent_id);

-- ---------------------------------------------------------------------
-- 4. archetype catalog seed (idempotent)
-- ---------------------------------------------------------------------
INSERT INTO dos.dynamic_ui_page_archetype (archetype_id, description_key, default_layout, default_zones, agent_capable)
VALUES
  ('overview',  'archetype.overview.desc',  'overview',  '["main","side"]'::jsonb, TRUE),
  ('list',      'archetype.list.desc',      'list',      '["main","filters","side"]'::jsonb, TRUE),
  ('object',    'archetype.object.desc',    'object',    '["header","main","side","tabs"]'::jsonb, TRUE),
  ('workflow',  'archetype.workflow.desc',  'workflow',  '["timeline","main","side"]'::jsonb, TRUE),
  ('audit',     'archetype.audit.desc',     'audit',     '["filters","main"]'::jsonb, TRUE),
  ('settings',  'archetype.settings.desc',  'settings',  '["main"]'::jsonb, FALSE),
  ('catalog',   'archetype.catalog.desc',   'catalog',   '["main","filters"]'::jsonb, TRUE),
  ('hierarchy', 'archetype.hierarchy.desc', 'hierarchy', '["main","side"]'::jsonb, TRUE),
  ('review',    'archetype.review.desc',    'review',    '["main","side"]'::jsonb, TRUE),
  ('lifecycle', 'archetype.lifecycle.desc', 'lifecycle', '["timeline","main"]'::jsonb, TRUE),
  ('diagnostics','archetype.diagnostics.desc','diagnostics','["main"]'::jsonb, TRUE),
  ('reference', 'archetype.reference.desc', 'reference', '["main","filters"]'::jsonb, FALSE),
  ('policy',    'archetype.policy.desc',    'policy',    '["main","side"]'::jsonb, TRUE),
  ('matrix',    'archetype.matrix.desc',    'matrix',    '["main","filters"]'::jsonb, TRUE)
ON CONFLICT (archetype_id) DO UPDATE
  SET description_key = EXCLUDED.description_key,
      default_layout  = EXCLUDED.default_layout,
      default_zones   = EXCLUDED.default_zones,
      agent_capable   = EXCLUDED.agent_capable,
      updated_at      = NOW();

COMMIT;

-- ---------------------------------------------------------------------
-- 5. self-assertion (RAISE EXCEPTION on missing structure)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  archetype_count   INT;
  required_tables   TEXT[] := ARRAY['dynamic_ui_page_archetype','dynamic_ui_page_persona','dynamic_ui_page_agent'];
  t TEXT;
  missing_table TEXT;
BEGIN
  FOREACH t IN ARRAY required_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'dos' AND table_name = t
    ) THEN
      missing_table := t;
      RAISE EXCEPTION 'Wave 2 self-assertion failed: table dos.% not created', missing_table;
    END IF;
  END LOOP;

  SELECT COUNT(*) INTO archetype_count FROM dos.dynamic_ui_page_archetype;
  IF archetype_count < 14 THEN
    RAISE EXCEPTION 'Wave 2 self-assertion failed: expected >=14 archetype rows, found %', archetype_count;
  END IF;
END $$;
